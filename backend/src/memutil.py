"""
Memory hygiene helper.

CPython frees objects by refcount, but the glibc allocator (used on Linux, incl.
Render) keeps freed blocks in per-thread arenas rather than returning them to the
OS. After a big transient allocation (image decode, PDF/Excel parse) the process
RSS stays high and ratchets upward across requests until the container is
OOM-killed. Calling malloc_trim(0) forces glibc to release free arenas back to
the OS, so RSS drops after each heavy request.
"""

import gc
import platform


def release_memory() -> None:
    """Collect garbage and return freed heap to the OS (best-effort)."""
    gc.collect()
    if platform.system() != "Linux":
        return
    try:
        import ctypes
        libc = ctypes.CDLL("libc.so.6")
        libc.malloc_trim(0)
    except Exception:
        pass  # non-glibc / restricted env — nothing to do
