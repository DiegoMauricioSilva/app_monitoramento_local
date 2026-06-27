import os
import sys
import time
import datetime
import sqlite3
import threading
import re
from flask import Flask, jsonify, render_template, request

# Configuração de caminhos para o banco de dados na pasta 'db'
DB_DIR = "db"
DB_NAME = os.path.join(DB_DIR, "monitor_atividade.db")

# Cria a pasta 'db' caso ela ainda não exista
if not os.path.exists(DB_DIR):
    os.makedirs(DB_DIR)

# Configuração do Flask para buscar os templates e estáticos dentro da pasta 'web'
app = Flask(
    __name__, 
    template_folder='web', 
    static_folder='web', 
    static_url_path=''
)

FRIENDLY_NAMES = {
    "winword.exe": "Microsoft Word",
    "word": "Microsoft Word",
    "excel.exe": "Microsoft Excel",
    "excel": "Microsoft Excel",
    "powerpnt.exe": "Microsoft PowerPoint",
    "powerpoint": "Microsoft PowerPoint",
    "chrome.exe": "Google Chrome",
    "chrome": "Google Chrome",
    "google chrome": "Google Chrome",
    "msedge.exe": "Microsoft Edge",
    "edge": "Microsoft Edge",
    "microsoft edge": "Microsoft Edge",
    "firefox.exe": "Mozilla Firefox",
    "firefox": "Mozilla Firefox",
    "notepad.exe": "Bloco de Notas",
    "notepad": "Bloco de Notas",
    "code.exe": "VS Code",
    "visual studio code": "VS Code",
    "code": "VS Code",
    "explorer.exe": "Windows Explorer",
    "finder": "macOS Finder",
    "terminal": "Terminal",
    "cmd.exe": "Prompt de Comando",
    "cmd": "Prompt de Comando",
    "powershell.exe": "PowerShell",
    "powershell": "PowerShell",
    "slack.exe": "Slack",
    "slack": "Slack",
    "teams.exe": "Microsoft Teams",
    "teams": "Microsoft Teams",
    "spotify.exe": "Spotify",
    "spotify": "Spotify",
    "discord.exe": "Discord",
    "discord": "Discord",
    "sublime_text.exe": "Sublime Text",
    "sublime_text": "Sublime Text",
}

def get_friendly_app_name(raw_app_name):
    raw_lower = raw_app_name.lower()
    if raw_lower in FRIENDLY_NAMES:
        return FRIENDLY_NAMES[raw_lower]
    if raw_lower.endswith(".exe"):
        name = raw_app_name[:-4]
        return name.capitalize()
    return raw_app_name

def extract_document_name(friendly_app, title):
    if not title:
        return "Sem título"
    
    suffixes_to_strip = [
        " - Microsoft Word", " - Word",
        " - Microsoft Excel", " - Excel",
        " - Microsoft PowerPoint", " - PowerPoint",
        " - Google Chrome", " - Microsoft Edge", " - Mozilla Firefox",
        " - Visual Studio Code", " - VS Code", " - Bloco de Notas", " - Notepad",
        " - Adobe Acrobat Reader DC", " - Adobe Acrobat", " - Slack", " - Discord",
        " - Opera", " - Brave", " - Sublime Text"
    ]
    
    clean = title
    for s in suffixes_to_strip:
        if clean.endswith(s):
            clean = clean[:-len(s)]
            break
            
    clean = re.sub(r' - [^-]+ - Microsoft Edge$', '', clean)
    clean = re.sub(r' - [^-]+ - Google Chrome$', '', clean)
    clean = clean.strip(" -")
    return clean if clean else "Sem nome de arquivo"

def get_active_window_info():
    try:
        if sys.platform == "win32":
            import win32gui
            import win32process
            import psutil
            
            hwnd = win32gui.GetForegroundWindow()
            if hwnd:
                title = win32gui.GetWindowText(hwnd)
                _, pid = win32process.GetWindowThreadProcessId(hwnd)
                try:
                    proc = psutil.Process(pid)
                    exe_name = proc.name()
                except Exception:
                    exe_name = "Desconhecido"
                return exe_name, title
                
        elif sys.platform == "darwin":
            import subprocess
            cmd = """
            tell application "System Events"
                set frontmostProcess to first process whose frontmost is true
                set processName to name of frontmostProcess
                tell frontmostProcess
                    if exists (window 1) then
                        set windowTitle to name of window 1
                    else
                        set windowTitle to ""
                    end if
                end tell
                return processName & "|||" & windowTitle
            end tell
            """
            proc = subprocess.Popen(['osascript', '-e', cmd], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            out, _ = proc.communicate()
            if out:
                parts = out.decode('utf-8').strip().split('|||')
                if len(parts) == 2:
                    return parts[0], parts[1]
                    
        elif sys.platform.startswith("linux"):
            import subprocess
            try:
                out_id = subprocess.check_output(["xdotool", "getactivewindow"]).decode().strip()
                out_title = subprocess.check_output(["xdotool", "getwindowname", out_id]).decode().strip()
                out_class = subprocess.check_output(["xprop", "-id", out_id, "WM_CLASS"]).decode().strip()
                app_name = out_class.split("=")[-1].strip().replace('"', '').split(',')[0]
                return app_name, out_title
            except Exception:
                pass
    except Exception:
        pass
    return "Ocioso/Bloqueado", "Nenhuma atividade ativa"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS atividade (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            app_name TEXT,
            window_title TEXT,
            start_time REAL,
            end_time REAL,
            duration INTEGER
        )
    ''')
    conn.commit()
    conn.close()

def create_session(app_name, window_title, start_time):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO atividade (app_name, window_title, start_time, end_time, duration)
        VALUES (?, ?, ?, ?, 0)
    ''', (app_name, window_title, start_time, start_time))
    session_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return session_id

def update_session(session_id, end_time, duration):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE atividade
        SET end_time = ?, duration = ?
        WHERE id = ?
    ''', (end_time, duration, session_id))
    conn.commit()
    conn.close()

def tracker_thread():
    init_db()
    current_id = None
    last_app = None
    last_title = None
    start_time = None

    while True:
        try:
            time.sleep(1)
            app_name, window_title = get_active_window_info()
            
            if not app_name or app_name == "Ocioso/Bloqueado":
                if current_id is not None:
                    current_id, last_app, last_title, start_time = None, None, None, None
                continue

            now = time.time()

            if app_name != last_app or window_title != last_title:
                start_time = now
                current_id = create_session(app_name, window_title, start_time)
                last_app = app_name
                last_title = window_title
            else:
                if current_id is not None and start_time is not None:
                    duration = int(now - start_time)
                    update_session(current_id, now, duration)
        except Exception as e:
            print(f"Erro no rastreador: {e}")

@app.route('/api/status')
def api_status():
    raw_app, window_title = get_active_window_info()
    friendly_app = get_friendly_app_name(raw_app)
    doc_name = extract_document_name(friendly_app, window_title)
    return jsonify({
        'active_app': friendly_app,
        'active_title': doc_name
    })

@app.route('/api/stats')
def api_stats():
    range_type = request.args.get('range', 'today')
    now = datetime.datetime.now()
    
    if range_type == 'today':
        start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
        start_ts = start_dt.timestamp()
        end_ts = now.timestamp()
    elif range_type == 'yesterday':
        start_dt = (now - datetime.timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        end_dt = start_dt + datetime.timedelta(days=1) - datetime.timedelta(seconds=1)
        start_ts = start_dt.timestamp()
        end_ts = end_dt.timestamp()
    elif range_type == 'week':
        start_dt = now - datetime.timedelta(days=7)
        start_ts = start_dt.timestamp()
        end_ts = now.timestamp()
    elif range_type == 'custom':
        start_str = request.args.get('start')
        end_str = request.args.get('end')
        try:
            start_dt = datetime.datetime.strptime(start_str, "%Y-%m-%d").replace(hour=0, minute=0, second=0)
            end_dt = datetime.datetime.strptime(end_str, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            start_ts = start_dt.timestamp()
            end_ts = end_dt.timestamp()
        except Exception:
            start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
            start_ts = start_dt.timestamp()
            end_ts = now.timestamp()
    else:
        start_ts = 0
        end_ts = now.timestamp()

    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute('''
        SELECT app_name, window_title, duration
        FROM atividade
        WHERE start_time >= ? AND start_time <= ? AND duration > 0
    ''', (start_ts, end_ts))
    rows = cursor.fetchall()
    conn.close()

    app_totals = {}
    detail_totals = {}

    for row in rows:
        raw_app = row['app_name']
        title = row['window_title']
        duration = row['duration']

        friendly_app = get_friendly_app_name(raw_app)
        doc_name = extract_document_name(friendly_app, title)

        app_totals[friendly_app] = app_totals.get(friendly_app, 0) + duration
        key = (friendly_app, doc_name)
        detail_totals[key] = detail_totals.get(key, 0) + duration

    sorted_apps = [
        {"app_name": app, "total_duration": dur}
        for app, dur in sorted(app_totals.items(), key=lambda x: x[1], reverse=True)
    ]

    sorted_details = [
        {"app_name": app, "window_title": doc, "total_duration": dur}
        for (app, doc), dur in sorted(detail_totals.items(), key=lambda x: x[1], reverse=True)
    ]

    return jsonify({
        'apps': sorted_apps,
        'details': sorted_details
    })

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    tracker_thread_instance = threading.Thread(target=tracker_thread, daemon=True)
    tracker_thread_instance.start()
    app.run(host='127.0.0.1', port=5005, debug=False)