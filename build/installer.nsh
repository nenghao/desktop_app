; 自定义 NSIS 安装脚本
; 确保安装目录默认为 $LOCALAPPDATA\Questech

!macro preInit
  ; 在初始化之前设置默认安装目录
  SetRegView 64
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$LOCALAPPDATA\Questech"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$LOCALAPPDATA\Questech"
  SetRegView 32
!macroend

!macro customInit
  ; 设置默认安装目录为用户 AppData
  StrCpy $INSTDIR "$LOCALAPPDATA\Questech"
!macroend

!macro customInstall
  ; 安装完成后的自定义操作（如需要）
!macroend
