; 自定义 NSIS 安装脚本
; 确保安装目录始终包含 Questech 子目录

!macro preInit
  ; 在初始化之前设置默认安装目录
  SetRegView 64
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$LOCALAPPDATA\Questech"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$LOCALAPPDATA\Questech"
  SetRegView 32
!macroend

!macro customInit
  ; 设置默认安装目录为用户 AppData，大写 Questech
  StrCpy $INSTDIR "$LOCALAPPDATA\Questech"
!macroend

!macro customInstall
  ; 安装完成后的自定义操作
!macroend

Function .onVerifyInstDir
  ; 在用户选择目录后,检查并自动添加 Questech 子目录
  Push $0
  Push $1
  Push $2
  
  ; 获取路径长度
  StrLen $0 $INSTDIR
  
  ; 检查路径是否以 \Questech 结尾
  IntOp $1 $0 - 9
  StrCpy $2 $INSTDIR "" $1
  StrCmp $2 "\Questech" done
  
  ; 获取最后一个反斜杠的位置
  StrCpy $1 $INSTDIR 1 -1
  StrCmp $1 "\" 0 +2
    StrCpy $INSTDIR $INSTDIR -1  ; 移除末尾的反斜杠
  
  ; 查找最后一个反斜杠
  StrCpy $1 ""
  StrCpy $2 0
  loop:
    IntOp $2 $2 + 1
    StrCpy $0 $INSTDIR 1 -$2
    StrCmp $0 "" found
    StrCmp $0 "\" found
    Goto loop
  
  found:
  ; 获取文件夹名称
  IntOp $2 $2 - 1
  StrCpy $1 $INSTDIR "" -$2
  
  ; 检查是否已经是 Questech
  StrCmp $1 "Questech" done
  
  ; 添加 \Questech
  StrCpy $INSTDIR "$INSTDIR\Questech"
  
  done:
  Pop $2
  Pop $1
  Pop $0
FunctionEnd
