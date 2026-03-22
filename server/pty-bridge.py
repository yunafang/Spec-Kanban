#!/usr/bin/env python3
"""
PTY bridge: creates a real pseudo-terminal for a command.
Communicates with the parent process via stdin/stdout pipes.
Used as a workaround when node-pty doesn't support the current Node.js version.

Usage: python3 pty-bridge.py <command> [args...]
- Parent writes to this process's stdin → forwarded to PTY
- PTY output → written to this process's stdout
- Resize: send line "$$RESIZE:<cols>:<rows>\n" to stdin
"""

import pty
import os
import sys
import select
import signal
import struct
import fcntl
import termios

def set_winsize(fd, rows, cols):
    winsize = struct.pack('HHHH', rows, cols, 0, 0)
    fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)

def main():
    if len(sys.argv) < 2:
        sys.exit(1)

    cmd = sys.argv[1:]

    # Get initial size from env
    cols = int(os.environ.get('COLUMNS', '120'))
    rows = int(os.environ.get('LINES', '30'))

    # Create PTY
    master_fd, slave_fd = pty.openpty()
    set_winsize(master_fd, rows, cols)

    # Fork the child process
    pid = os.fork()
    if pid == 0:
        # Child process
        os.close(master_fd)
        os.setsid()

        # Set controlling terminal
        fcntl.ioctl(slave_fd, termios.TIOCSCTTY, 0)

        os.dup2(slave_fd, 0)
        os.dup2(slave_fd, 1)
        os.dup2(slave_fd, 2)
        if slave_fd > 2:
            os.close(slave_fd)

        os.execvp(cmd[0], cmd)

    # Parent process
    os.close(slave_fd)

    # Make stdin non-blocking
    flags = fcntl.fcntl(sys.stdin.fileno(), fcntl.F_GETFL)
    fcntl.fcntl(sys.stdin.fileno(), fcntl.F_SETFL, flags | os.O_NONBLOCK)

    # Make stdout unbuffered
    sys.stdout = os.fdopen(sys.stdout.fileno(), 'wb', 0)

    stdin_fd = sys.stdin.fileno()

    try:
        while True:
            rlist, _, _ = select.select([master_fd, stdin_fd], [], [], 0.05)

            for fd in rlist:
                if fd == master_fd:
                    try:
                        data = os.read(master_fd, 4096)
                        if not data:
                            raise EOFError
                        sys.stdout.write(data)
                    except (OSError, EOFError):
                        os.close(master_fd)
                        _, status = os.waitpid(pid, 0)
                        sys.exit(os.WEXITSTATUS(status) if os.WIFEXITED(status) else 1)

                elif fd == stdin_fd:
                    try:
                        data = os.read(stdin_fd, 4096)
                        if not data:
                            raise EOFError
                        # Check for resize command
                        text = data.decode('utf-8', errors='replace')
                        if text.startswith('$$RESIZE:'):
                            parts = text.strip().split(':')
                            if len(parts) == 3:
                                try:
                                    set_winsize(master_fd, int(parts[2]), int(parts[1]))
                                    os.kill(pid, signal.SIGWINCH)
                                except (ValueError, OSError):
                                    pass
                        else:
                            os.write(master_fd, data)
                    except (OSError, EOFError):
                        pass

            # Check if child is still alive
            try:
                result = os.waitpid(pid, os.WNOHANG)
                if result[0] != 0:
                    # Child exited, drain remaining output
                    try:
                        while True:
                            data = os.read(master_fd, 4096)
                            if not data:
                                break
                            sys.stdout.write(data)
                    except OSError:
                        pass
                    os.close(master_fd)
                    sys.exit(os.WEXITSTATUS(result[1]) if os.WIFEXITED(result[1]) else 1)
            except ChildProcessError:
                break

    except KeyboardInterrupt:
        os.kill(pid, signal.SIGTERM)
        os.close(master_fd)
        sys.exit(0)

if __name__ == '__main__':
    main()
