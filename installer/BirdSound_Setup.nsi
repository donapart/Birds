; BirdSound Windows Installer Script (NSIS)
; Build: makensis BirdSound_Setup.nsi

!include "MUI2.nsh"
!include "FileFunc.nsh"

; --- Allgemeine Einstellungen ---
!define PRODUCT_NAME "BirdSound"
!define PRODUCT_VERSION "5.5.0"
!define PRODUCT_PUBLISHER "BirdSound Project"
!define PRODUCT_WEB_SITE "https://github.com/donapart/Birds"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
!define PRODUCT_UNINST_ROOT_KEY "HKLM"

Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "output\BirdSound_${PRODUCT_VERSION}_Setup.exe"
InstallDir "$PROGRAMFILES64\${PRODUCT_NAME}"
InstallDirRegKey HKLM "${PRODUCT_UNINST_KEY}" "InstallLocation"
RequestExecutionLevel admin
SetCompressor /SOLID lzma
Unicode True

; --- MUI Einstellungen ---
!define MUI_ABORTWARNING
; Icon nur wenn vorhanden
; !define MUI_ICON "assets\birdsound.ico"
; !define MUI_UNICON "assets\birdsound.ico"

; --- Seiten ---
!insertmacro MUI_PAGE_WELCOME
; License nur wenn vorhanden
; !insertmacro MUI_PAGE_LICENSE "..\LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\start_birdsound.bat"
!define MUI_FINISHPAGE_RUN_TEXT "BirdSound jetzt starten"
!insertmacro MUI_PAGE_FINISH

; Uninstaller
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; --- Sprachen ---
!insertmacro MUI_LANGUAGE "German"
!insertmacro MUI_LANGUAGE "English"

; --- Installation ---
Section "BirdSound" SEC01
    SetOutPath "$INSTDIR"
    SetOverwrite on
    
    ; Backend
    SetOutPath "$INSTDIR\backend"
    File /r /x "*.pyc" /x "__pycache__" /x "*.egg-info" /x ".env" /x "*.db" /x "venv" /x "*.log" "..\backend\*.*"
    
    ; Scripts
    SetOutPath "$INSTDIR\scripts"
    File /r "..\scripts\*.*"
    
    ; Docs
    SetOutPath "$INSTDIR"
    File "..\README.md"
    ; License nur wenn vorhanden
    ; File /nonfatal "..\LICENSE"
    
    ; Launcher
    File "scripts\start_birdsound.bat"
    File "scripts\stop_birdsound.bat"
    
    ; Icon nur wenn vorhanden
    ; File "assets\birdsound.ico"
    
    ; .env erstellen
    IfFileExists "$INSTDIR\backend\.env" +7
        FileOpen $0 "$INSTDIR\backend\.env" w
        FileWrite $0 "USE_SQLITE=true$\r$\n"
        FileWrite $0 "USE_MODEL_STUBS=false$\r$\n"
        FileWrite $0 "DEBUG=false$\r$\n"
        FileWrite $0 "AUDIO_SAMPLE_RATE=48000$\r$\n"
        FileWrite $0 "MIN_CONFIDENCE_THRESHOLD=0.1$\r$\n"
        FileWrite $0 "TOP_N_PREDICTIONS=5$\r$\n"
        FileClose $0
    
    ; Startmenü
    CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
    CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\start_birdsound.bat"
    CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\Web UI.lnk" "http://localhost:8003"
    CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\Deinstallieren.lnk" "$INSTDIR\uninst.exe"
    
    ; Desktop-Icon (optional)
    CreateShortCut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\start_birdsound.bat"
SectionEnd

Section -Post
    WriteUninstaller "$INSTDIR\uninst.exe"
    WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayName" "${PRODUCT_NAME}"
    ; WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\birdsound.ico"
    WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
    WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
    WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
    WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\uninst.exe"
    WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "InstallLocation" "$INSTDIR"
    
    ; Größe berechnen
    ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
    IntFmt $0 "0x%08X" $0
    WriteRegDWORD ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "EstimatedSize" "$0"
SectionEnd

; --- Deinstallation ---
Section Uninstall
    ; Prozess beenden
    nsExec::ExecToLog '"$INSTDIR\stop_birdsound.bat"'
    
    ; Dateien löschen
    RMDir /r "$INSTDIR\backend"
    RMDir /r "$INSTDIR\scripts"
    RMDir /r "$INSTDIR\venv"
    RMDir /r "$INSTDIR\logs"
    RMDir /r "$INSTDIR\audio_storage"
    Delete "$INSTDIR\*.md"
    Delete "$INSTDIR\*.bat"
    ; Delete "$INSTDIR\*.ico"
    Delete "$INSTDIR\*.db"
    Delete "$INSTDIR\LICENSE"
    Delete "$INSTDIR\uninst.exe"
    RMDir "$INSTDIR"
    
    ; Startmenü
    RMDir /r "$SMPROGRAMS\${PRODUCT_NAME}"
    Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
    
    ; Registry
    DeleteRegKey ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}"
SectionEnd
