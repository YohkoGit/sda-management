import { useTranslation } from "react-i18next";

function App() {
  const { t } = useTranslation();

  return (
    <div id="app">
      <h1>{t("app.title")}</h1>
    </div>
  );
}

export default App;
