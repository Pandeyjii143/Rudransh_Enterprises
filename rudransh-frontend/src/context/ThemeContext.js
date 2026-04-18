import { createContext, useContext, useState, useEffect } from "react";

const themes = {
  light: {
    name: "Light",
    background: "#ffffff",
    surface: "#f5f5f5",
    text: "#333333",
    primary: "#007bff",
    secondary: "#6c757d",
    accent: "#28a745",
  },
  dark: {
    name: "Dark",
    background: "#121212",
    surface: "#1e1e1e",
    text: "#ffffff",
    primary: "#bb86fc",
    secondary: "#03dac6",
    accent: "#cf6679",
  },
  blue: {
    name: "Blue",
    background: "#e3f2fd",
    surface: "#ffffff",
    text: "#0d47a1",
    primary: "#1976d2",
    secondary: "#42a5f5",
    accent: "#1565c0",
  },
  green: {
    name: "Green",
    background: "#e8f5e8",
    surface: "#ffffff",
    text: "#1b5e20",
    primary: "#388e3c",
    secondary: "#66bb6a",
    accent: "#2e7d32",
  },
};

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    setCurrentTheme(savedTheme);
  }, []);

  const changeTheme = (themeName) => {
    setCurrentTheme(themeName);
    localStorage.setItem("theme", themeName);
  };

  const theme = themes[currentTheme];

  return (
    <ThemeContext.Provider value={{ theme, currentTheme, changeTheme, themes }}>
      <div style={{
        backgroundColor: theme.background,
        color: theme.text,
        minHeight: "100vh",
        transition: "background-color 0.3s, color 0.3s"
      }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};