; BirdSound Windows Installer Script
; Requires Inno Setup 6.x (https://jrsoftware.org/isinfo.php)
; 
; Build: Open this file in Inno Setup Compiler and click Build > Compile
; Or run: iscc BirdSound_Setup.iss

#define MyAppName "BirdSound"
#define MyAppVersion "5.4.0"
#define MyAppPublisher "BirdSound Project"
#define MyAppURL "https://github.com/donapart/Birds"
#define MyAppExeName "start_birdsound.bat"

[Setup]
; App identity
AppId={{A7B8C9D0-E1F2-3456-7890-ABCDEF123456}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}/issues
AppUpdatesURL={#MyAppURL}/releases

; Paths
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=installer\output
OutputBaseFilename=BirdSound_{#MyAppVersion}_Setup_win
SetupIconFile=installer\assets\birdsound.ico
UninstallDisplayIcon={app}\birdsound.ico

; Compression
Compression=lzma2/ultra64
SolidCompression=yes
LZMAUseSeparateProcess=yes

; Privileges
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog

; UI
WizardStyle=modern
WizardImageFile=installer\assets\wizard.bmp
WizardSmallImageFile=installer\assets\wizard_small.bmp

; Misc
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "german"; MessagesFile: "compiler:Languages\German.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1; Check: not IsAdminInstallMode

[Files]
; Backend files
Source: "backend\*"; DestDir: "{app}\backend"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "*.pyc,__pycache__,*.egg-info,.env,*.db,venv,*.log"

; Scripts
Source: "scripts\*"; DestDir: "{app}\scripts"; Flags: ignoreversion recursesubdirs createallsubdirs

; Documentation
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "LICENSE"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist

; Launcher scripts
Source: "installer\scripts\start_birdsound.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "installer\scripts\stop_birdsound.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "installer\scripts\install_python.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion

; Icon
Source: "installer\assets\birdsound.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\birdsound.ico"
Name: "{group}\{#MyAppName} Web UI"; Filename: "http://localhost:8003"; IconFilename: "{app}\birdsound.ico"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\birdsound.ico"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: quicklaunchicon

[Run]
; Post-install: Setup Python environment
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\scripts\install_python.ps1"""; StatusMsg: "Setting up Python environment..."; Flags: runhidden waituntilterminated
; Optional: Start app after install
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "{app}\stop_birdsound.bat"; Flags: runhidden waituntilterminated skipifdoesntexist

[UninstallDelete]
Type: filesandordirs; Name: "{app}\venv"
Type: filesandordirs; Name: "{app}\*.db"
Type: filesandordirs; Name: "{app}\logs"
Type: filesandordirs; Name: "{app}\audio_storage"

[Code]
function InitializeSetup(): Boolean;
begin
  Result := True;
  // Check for Python 3.11+
  // Could add Python detection here
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    // Create .env file if doesn't exist
    if not FileExists(ExpandConstant('{app}\backend\.env')) then
    begin
      SaveStringToFile(ExpandConstant('{app}\backend\.env'),
        'USE_SQLITE=true' + #13#10 +
        'USE_MODEL_STUBS=false' + #13#10 +
        'DEBUG=false' + #13#10 +
        'AUDIO_SAMPLE_RATE=48000' + #13#10 +
        'MIN_CONFIDENCE_THRESHOLD=0.1' + #13#10 +
        'TOP_N_PREDICTIONS=5' + #13#10,
        False);
    end;
  end;
end;
