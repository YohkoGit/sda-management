import { useTranslation } from "react-i18next";
import { AuthProvider } from "@/contexts/AuthContext";

function App() {
  const { t } = useTranslation();

  return (
    <AuthProvider>
      <div id="app">
        <h1>{t("app.title")}</h1>
      </div>
    </AuthProvider>
  );
}

export default App;
