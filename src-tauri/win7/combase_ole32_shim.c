/*
 * Windows 7 SP1 compatibility shim for classic COM functions moved from ole32.dll to combase.dll in Windows 8.
 *
 * windows-targets / windows.0.52.0.lib links CoTaskMemAlloc, CoTaskMemFree, and
 * CoCreateFreeThreadedMarshaler against combase.dll, which does not exist on Windows 7.
 * All three exports exist with identical ABI inside Win7's native ole32.dll (and remain
 * exported by ole32.dll on Windows 8/10/11).
 *
 * Compile with: cl /nologo /c /O2 /GS- /Zl /Fo:combase_ole32_shim.obj combase_ole32_shim.c
 */
#include <stddef.h>
#include <stdint.h>

#ifdef _M_IX86
extern long __cdecl _InterlockedCompareExchange(long volatile* Destination, long Exchange, long Comparand);
#pragma intrinsic(_InterlockedCompareExchange)
static void* shim_cas_ptr(void* volatile* dst, void* exch, void* comp) {
    return (void*)_InterlockedCompareExchange((long volatile*)dst, (long)exch, (long)comp);
}
#else
extern void* _InterlockedCompareExchangePointer(void* volatile* Destination, void* Exchange, void* Comparand);
#pragma intrinsic(_InterlockedCompareExchangePointer)
static void* shim_cas_ptr(void* volatile* dst, void* exch, void* comp) {
    return _InterlockedCompareExchangePointer(dst, exch, comp);
}
#endif

__declspec(dllimport) void* __stdcall GetModuleHandleW(const wchar_t* lpModuleName);
__declspec(dllimport) void* __stdcall LoadLibraryW(const wchar_t* lpLibFileName);
__declspec(dllimport) void* __stdcall GetProcAddress(void* hModule, const char* lpProcName);

typedef void* (__stdcall *PFN_CoTaskMemAlloc)(size_t cb);
typedef void  (__stdcall *PFN_CoTaskMemFree)(void* pv);
typedef int32_t (__stdcall *PFN_CoCreateFreeThreadedMarshaler)(void* punkOuter, void** ppunkMarshal);

static void* get_ole32_module(void) {
    static void* volatile cached = NULL;
    void* h = cached;
    if (!h) {
        h = GetModuleHandleW(L"ole32.dll");
        if (!h) {
            h = LoadLibraryW(L"ole32.dll");
        }
        if (h) {
            shim_cas_ptr(&cached, h, NULL);
        }
    }
    return h;
}

static void* __stdcall shim_CoTaskMemAlloc(size_t cb) {
    static void* volatile cached = NULL;
    PFN_CoTaskMemAlloc fn = (PFN_CoTaskMemAlloc)cached;
    if (!fn) {
        void* h = get_ole32_module();
        if (h) {
            fn = (PFN_CoTaskMemAlloc)GetProcAddress(h, "CoTaskMemAlloc");
            if (fn) {
                shim_cas_ptr(&cached, (void*)fn, NULL);
            }
        }
    }
    return fn ? fn(cb) : NULL;
}

static void __stdcall shim_CoTaskMemFree(void* pv) {
    static void* volatile cached = NULL;
    PFN_CoTaskMemFree fn = (PFN_CoTaskMemFree)cached;
    if (!fn) {
        void* h = get_ole32_module();
        if (h) {
            fn = (PFN_CoTaskMemFree)GetProcAddress(h, "CoTaskMemFree");
            if (fn) {
                shim_cas_ptr(&cached, (void*)fn, NULL);
            }
        }
    }
    if (fn) {
        fn(pv);
    }
}

static int32_t __stdcall shim_CoCreateFreeThreadedMarshaler(void* punkOuter, void** ppunkMarshal) {
    static void* volatile cached = NULL;
    PFN_CoCreateFreeThreadedMarshaler fn = (PFN_CoCreateFreeThreadedMarshaler)cached;
    if (!fn) {
        void* h = get_ole32_module();
        if (h) {
            fn = (PFN_CoCreateFreeThreadedMarshaler)GetProcAddress(h, "CoCreateFreeThreadedMarshaler");
            if (fn) {
                shim_cas_ptr(&cached, (void*)fn, NULL);
            }
        }
    }
    /* E_NOTIMPL = 0x80004001 */
    return fn ? fn(punkOuter, ppunkMarshal) : (int32_t)0x80004001u;
}

void* __stdcall CoTaskMemAlloc(size_t cb) {
    return shim_CoTaskMemAlloc(cb);
}

void __stdcall CoTaskMemFree(void* pv) {
    shim_CoTaskMemFree(pv);
}

int32_t __stdcall CoCreateFreeThreadedMarshaler(void* punkOuter, void** ppunkMarshal) {
    return shim_CoCreateFreeThreadedMarshaler(punkOuter, ppunkMarshal);
}

#ifndef _M_IX86
const void* const __imp_CoTaskMemAlloc = (const void*)shim_CoTaskMemAlloc;
const void* const __imp_CoTaskMemFree = (const void*)shim_CoTaskMemFree;
const void* const __imp_CoCreateFreeThreadedMarshaler = (const void*)shim_CoCreateFreeThreadedMarshaler;
#endif
