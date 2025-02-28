export interface GameSettings {
    soundsEnabled: boolean;
    applesIncreaseSpeed: boolean;
    showDebuggingInfo: boolean;
    snakeColor: string;
    appleColor: string;
}

export function getSettings(): GameSettings {
    const storageSettings: string | null = localStorage.getItem("settings");
    return storageSettings ? JSON.parse(storageSettings) : {
        soundsEnabled: true,
        applesIncreaseSpeed: true,
        showDebuggingInfo: false,
        snakeColor: "7CFF7F",
        appleColor: "FF7C7C"
    };
}

export function setSettings(settings: GameSettings) {
    localStorage.setItem("settings", JSON.stringify(settings));
}