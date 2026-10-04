import React, { useEffect, createContext, useState } from "react";

// Create a context for theme management
const ThemeContext = createContext(undefined);

// Function to get the system's preferred color scheme (light or dark)
function getSystemTheme() {
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
}

function ThemeProvider({ children }) {
    const savedTheme = localStorage.getItem("useTheme"); // check if user has a saved theme preference (light/dark)
    const userPreference = savedTheme !== null;
    
    // If add user preference useState(savedTheme || getSystemTheme())
    const [theme, setThemeState] = useState(getSystemTheme()); // default to system theme if no saved preference

    const [backgroundEffect, setBackgroundEffect] = useState("clouds"); // default effect is clouds
    const [isAnimating, setIsAnimating] = useState(false); // tracking animation state
    const [isUserInteracted] = useState(userPreference); // track if user has interacted with theme toggle
    
    // Update localStorage whenever theme changes
    function setTheme(newTheme) {
        setThemeState(newTheme);
        localStorage.setItem("useTheme", newTheme);
    }

    // Toggle between default background and clouds with fade animation
    function toggleBackground() {
        if (backgroundEffect === "default") {
            setBackgroundEffect("clouds");
        } else {
            setIsAnimating(true);
            setTimeout(() => {
                setBackgroundEffect("default");
                setIsAnimating(false);
            }, 1000);
        }
    }

    // Apply theme class to root element for global CSS styling
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark"); // remove existing theme classes
        root.classList.add(theme);
    } , [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, backgroundEffect, toggleBackground, isAnimating, isUserInteracted }}>
            {children}
        </ThemeContext.Provider>
    )
}

export { ThemeProvider, ThemeContext }; 
