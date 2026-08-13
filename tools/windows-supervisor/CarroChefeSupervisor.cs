using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using System.Drawing;
using System.Drawing.Drawing2D;

namespace CarroChefe.Supervisor
{
    internal static class Program
    {
        private static readonly object LogLock = new object();
        private static readonly Dictionary<string, Process> Children = new Dictionary<string, Process>();
        private static readonly HashSet<string> SeenNotifications = new HashSet<string>();
        private const string CentralUrl = "http://127.0.0.1:4173/gestao";
        private static string ProjectRoot;
        private static string LogRoot;
        private static volatile bool Stopping;
        private static volatile bool Paused;
        private static Mutex SingleInstance;
        private static NotifyIcon TrayIcon;
        private static bool NotificationsPrimed;
        private static Icon BrandIcon;
        private static Icon StatusIcon;
        private static string CurrentState = "offline";
        private static int ConsecutiveFailures;
        private static DateTime LastChildErrorAt = DateTime.MinValue;
        private static string StateFilePath;

        [STAThread]
        private static void Main(string[] args)
        {
            if (args != null && Array.Exists(args, delegate(string value) { return string.Equals(value, "--open", StringComparison.OrdinalIgnoreCase); }))
            {
                OpenCentral();
                return;
            }
            bool created;
            SingleInstance = new Mutex(true, "Local\\CarroChefeOperationalSupervisor", out created);
            if (!created) return;

            ProjectRoot = FindProjectRoot(AppDomain.CurrentDomain.BaseDirectory);
            if (ProjectRoot == null) return;
            LogRoot = Path.Combine(ProjectRoot, ".runtime", "logs");
            StateFilePath = Path.Combine(ProjectRoot, ".runtime", "supervisor-state.json");
            Directory.CreateDirectory(LogRoot);
            TrayIcon = new NotifyIcon();
            string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "CarroChefe.ico");
            BrandIcon = File.Exists(iconPath) ? new Icon(iconPath) : SystemIcons.Application;
            TrayIcon.Icon = BrandIcon;
            SetState("starting", "iniciando os serviços");
            TrayIcon.Visible = true;
            ConfigureTrayMenu();
            AppDomain.CurrentDomain.ProcessExit += delegate { Shutdown(); };
            Log("supervisor", "Supervisor iniciado em " + ProjectRoot);

            while (!Stopping)
            {
                try
                {
                    if (!Paused && !ApiIsHealthy()) EnsureProcess("api", "npm run dev");
                    if (!Paused && ApiIsHealthy())
                    {
                        ConsecutiveFailures = 0;
                        EnsureProcess("agents", "npm run bridge:codex");
                        EnsureProcess("webhooks", "npm run webhooks:dispatch");
                        CheckNotifications();
                        if ((DateTime.UtcNow - LastChildErrorAt).TotalSeconds >= 15) SetState("online", "ligada");
                    }
                    else if (!Paused)
                    {
                        ConsecutiveFailures++;
                        if (ConsecutiveFailures == 1) SetState("starting", "restabelecendo os serviços");
                        else if (ConsecutiveFailures >= 6) SetState("error", "erro ao iniciar; consulte os logs");
                    }
                }
                catch (Exception error) { Log("supervisor", "Falha no ciclo: " + error); SetState("error", "erro inesperado; consulte os logs"); }
                for (int tick = 0; tick < 50 && !Stopping; tick++)
                {
                    Thread.Sleep(100);
                    Application.DoEvents();
                }
            }
        }

        private static void ConfigureTrayMenu()
        {
            ContextMenuStrip menu = new ContextMenuStrip();
            ToolStripMenuItem open = new ToolStripMenuItem("Abrir Central Operacional");
            open.Font = new System.Drawing.Font(open.Font, System.Drawing.FontStyle.Bold);
            open.Click += delegate { OpenCentral(); };
            ToolStripMenuItem stop = new ToolStripMenuItem("Interromper serviços");
            stop.Click += delegate
            {
                Paused = true;
                StopChildren();
                SetState("offline", "desligada");
                ShowStatus("Supervisor interrompido", "API, agentes e webhooks foram encerrados. Use Reiniciar serviços para retomar.");
            };
            ToolStripMenuItem restart = new ToolStripMenuItem("Reiniciar serviços");
            restart.Click += delegate
            {
                Paused = true;
                StopChildren();
                ConsecutiveFailures = 0;
                SetState("starting", "reiniciando os serviços");
                Paused = false;
                ShowStatus("Supervisor reiniciando", "A Central Operacional, os agentes e os webhooks serão iniciados novamente.");
            };
            ToolStripMenuItem exit = new ToolStripMenuItem("Sair do supervisor");
            exit.Click += delegate { Shutdown(); };
            menu.Items.Add(open);
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add(stop);
            menu.Items.Add(restart);
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add(exit);
            TrayIcon.ContextMenuStrip = menu;
            TrayIcon.DoubleClick += delegate { OpenCentral(); };
        }

        private static void SetState(string state, string description)
        {
            if (TrayIcon == null || (CurrentState == state && StatusIcon != null)) return;
            Color color = state == "online" ? Color.FromArgb(59, 157, 91) : state == "starting" ? Color.FromArgb(227, 139, 38) : state == "error" ? Color.FromArgb(204, 55, 55) : Color.FromArgb(132, 132, 132);
            Icon next = CreateStatusIcon(color);
            Icon previous = StatusIcon;
            StatusIcon = next;
            TrayIcon.Icon = next;
            TrayIcon.Text = TruncateTooltip("Carro Chefe — " + description);
            CurrentState = state;
            try { File.WriteAllText(StateFilePath, "{\"status\":\"" + state + "\",\"description\":\"" + description.Replace("\\", "\\\\").Replace("\"", "\\\"") + "\",\"updatedAt\":\"" + DateTime.UtcNow.ToString("o") + "\"}"); } catch { }
            if (previous != null) previous.Dispose();
        }

        private static string TruncateTooltip(string value)
        {
            return value.Length <= 63 ? value : value.Substring(0, 63);
        }

        private static Icon CreateStatusIcon(Color statusColor)
        {
            Bitmap bitmap = new Bitmap(64, 64);
            using (Graphics graphics = Graphics.FromImage(bitmap))
            {
                graphics.SmoothingMode = SmoothingMode.AntiAlias;
                graphics.Clear(Color.Transparent);
                if (BrandIcon != null) graphics.DrawIcon(BrandIcon, new Rectangle(2, 2, 60, 60));
                using (SolidBrush shadow = new SolidBrush(Color.FromArgb(210, 20, 16, 12))) graphics.FillEllipse(shadow, 38, 38, 25, 25);
                using (SolidBrush brush = new SolidBrush(statusColor)) graphics.FillEllipse(brush, 42, 42, 18, 18);
                using (Pen border = new Pen(Color.White, 2.4f)) graphics.DrawEllipse(border, 42, 42, 18, 18);
            }
            IntPtr handle = bitmap.GetHicon();
            Icon icon = (Icon)Icon.FromHandle(handle).Clone();
            DestroyIcon(handle);
            bitmap.Dispose();
            return icon;
        }

        [System.Runtime.InteropServices.DllImport("user32.dll", CharSet = System.Runtime.InteropServices.CharSet.Auto)]
        private static extern bool DestroyIcon(IntPtr handle);

        private static void OpenCentral()
        {
            try { Process.Start(new ProcessStartInfo(CentralUrl) { UseShellExecute = true }); }
            catch (Exception error) { Log("supervisor", "Falha ao abrir a Central: " + error.Message); }
        }

        private static void ShowStatus(string title, string message)
        {
            if (TrayIcon == null) return;
            TrayIcon.BalloonTipTitle = title;
            TrayIcon.BalloonTipText = message;
            TrayIcon.BalloonTipIcon = ToolTipIcon.Info;
            TrayIcon.ShowBalloonTip(4500);
        }

        private static string FindProjectRoot(string start)
        {
            DirectoryInfo current = new DirectoryInfo(start);
            while (current != null)
            {
                string package = Path.Combine(current.FullName, "package.json");
                if (File.Exists(package) && File.ReadAllText(package).Contains("carro-chefe-platform")) return current.FullName;
                current = current.Parent;
            }
            return null;
        }

        private static bool ApiIsHealthy()
        {
            try
            {
                HttpWebRequest request = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:4173/api/health");
                request.Timeout = 1500;
                request.ReadWriteTimeout = 1500;
                using (HttpWebResponse response = (HttpWebResponse)request.GetResponse()) return response.StatusCode == HttpStatusCode.OK;
            }
            catch { return false; }
        }

        private static void EnsureProcess(string name, string command)
        {
            Process current;
            if (Children.TryGetValue(name, out current) && current != null && !current.HasExited) return;
            if (current != null && current.HasExited)
            {
                Log(name, "Processo terminou com código " + current.ExitCode + "; reiniciando.");
                if (current.ExitCode != 0) { LastChildErrorAt = DateTime.UtcNow; SetState("error", name + " encerrou com erro"); }
            }

            ProcessStartInfo start = new ProcessStartInfo();
            start.FileName = Environment.GetEnvironmentVariable("COMSPEC") ?? "cmd.exe";
            start.Arguments = "/d /s /c \"chcp 65001>nul & " + command + "\"";
            start.WorkingDirectory = ProjectRoot;
            start.UseShellExecute = false;
            start.CreateNoWindow = true;
            start.WindowStyle = ProcessWindowStyle.Hidden;
            start.RedirectStandardOutput = true;
            start.RedirectStandardError = true;
            start.StandardOutputEncoding = Encoding.UTF8;
            start.StandardErrorEncoding = Encoding.UTF8;

            Process process = new Process();
            process.StartInfo = start;
            process.EnableRaisingEvents = true;
            process.OutputDataReceived += delegate(object sender, DataReceivedEventArgs eventArgs) { if (eventArgs.Data != null) Log(name, eventArgs.Data); };
            process.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs eventArgs) { if (eventArgs.Data != null) Log(name, "ERRO " + eventArgs.Data); };
            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();
            Children[name] = process;
            Log(name, "Processo iniciado (PID " + process.Id + "): " + command);
        }

        private static void CheckNotifications()
        {
            try
            {
                using (WebClient client = new WebClient())
                {
                    client.Encoding = Encoding.UTF8;
                    string json = client.DownloadString("http://127.0.0.1:4173/api/v1/notifications?unread=true");
                    JavaScriptSerializer serializer = new JavaScriptSerializer();
                    object[] items = serializer.Deserialize<object[]>(json);
                    foreach (object item in items)
                    {
                        Dictionary<string, object> notification = item as Dictionary<string, object>;
                        if (notification == null || !notification.ContainsKey("id")) continue;
                        string id = Convert.ToString(notification["id"]);
                        if (NotificationsPrimed && !SeenNotifications.Contains(id))
                        {
                            string title = notification.ContainsKey("title") ? Convert.ToString(notification["title"]) : "Carro Chefe";
                            string message = notification.ContainsKey("message") ? Convert.ToString(notification["message"]) : "Uma tarefa foi concluída.";
                            TrayIcon.BalloonTipTitle = title;
                            TrayIcon.BalloonTipText = message.Length > 240 ? message.Substring(0, 237) + "..." : message;
                            TrayIcon.BalloonTipIcon = ToolTipIcon.Info;
                            TrayIcon.ShowBalloonTip(5000);
                        }
                        SeenNotifications.Add(id);
                    }
                    NotificationsPrimed = true;
                }
            }
            catch (Exception error) { Log("supervisor", "Falha ao consultar notificações: " + error.Message); }
        }

        private static void Log(string name, string message)
        {
            if (LogRoot == null) return;
            lock (LogLock)
            {
                File.AppendAllText(Path.Combine(LogRoot, name + ".log"), DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + " " + message + Environment.NewLine);
            }
        }

        private static void StopChildren()
        {
            foreach (KeyValuePair<string, Process> child in Children)
            {
                try
                {
                    if (child.Value != null && !child.Value.HasExited)
                    {
                        ProcessStartInfo kill = new ProcessStartInfo("taskkill.exe", "/PID " + child.Value.Id + " /T /F");
                        kill.CreateNoWindow = true;
                        kill.UseShellExecute = false;
                        Process.Start(kill).WaitForExit(3000);
                    }
                }
                catch { }
            }
            Children.Clear();
        }

        private static void Shutdown()
        {
            if (Stopping) return;
            Stopping = true;
            StopChildren();
            try { if (SingleInstance != null) SingleInstance.ReleaseMutex(); } catch { }
            try { if (TrayIcon != null) { SetState("offline", "desligada"); TrayIcon.Visible = false; TrayIcon.Dispose(); } } catch { }
            try { if (StatusIcon != null) StatusIcon.Dispose(); } catch { }
            try { if (BrandIcon != null) BrandIcon.Dispose(); } catch { }
        }
    }
}
