; Windows 7 SP1 x86 import-pointer shim for classic COM functions moved from
; ole32.dll to combase.dll in Windows 8.
;
; Assemble with:
;   ml /nologo /c /coff /safeseh /Fo"combase_ole32_shim_x86.obj" combase_ole32_shim_x86.asm

.686
.model flat
option casemap:none

EXTERN _CoTaskMemAlloc@4:PROC
EXTERN _CoTaskMemFree@4:PROC
EXTERN _CoCreateFreeThreadedMarshaler@8:PROC

PUBLIC __imp__CoTaskMemAlloc@4
PUBLIC __imp__CoTaskMemFree@4
PUBLIC __imp__CoCreateFreeThreadedMarshaler@8

.const
ALIGN 4
__imp__CoTaskMemAlloc@4                 DD _CoTaskMemAlloc@4
__imp__CoTaskMemFree@4                  DD _CoTaskMemFree@4
__imp__CoCreateFreeThreadedMarshaler@8  DD _CoCreateFreeThreadedMarshaler@8

END
