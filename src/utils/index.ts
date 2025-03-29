export function getLanguageColor(language: string | null): string {
    const colors: Record<string, string> = {
      "JavaScript": "#f1e05a",
      "TypeScript": "#3178c6",
      "HTML": "#e34c26",
      "CSS": "#563d7c",
      "Python": "#3572A5",
      "Java": "#b07219",
      "Go": "#00ADD8",
      "Rust": "#dea584",
      "C": "#555555",
      "C++": "#f34b7d",
      "C#": "#178600",
      "Ruby": "#701516",
      "PHP": "#4F5D95",
      "Swift": "#ffac45",
      "Kotlin": "#F18E33",
      "Solidity": "#AA6746"
    };
    
    return colors[language || ""] || "#858585"; // Default gray for unknown languages
  }