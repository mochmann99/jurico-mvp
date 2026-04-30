using System;
using System.Windows.Forms;

namespace Jurico;

internal static class Program
{
    [STAThread]
    static void Main()
    {
        ApplicationConfiguration.Initialize();
        var dbPath = System.IO.Path.Combine(AppContext.BaseDirectory, "jurico.db");
        var database = new JuricoDatabase(dbPath);
        database.Initialize();

        Application.Run(new MainForm(database, new AiAnalysisService()));
    }
}
