import React from "react";

const WidgetPreview = ({ 
  serverData, 
  enabledFields, 
  theme, 
  accentColor, 
  backgroundColor,
  textColor,
  fontFamily, 
  darkMode,
  borderRadius = 16,
  borderStyle = "solid",
  shadowIntensity = 50,
  animationSpeed = "normal",
  layout = "default"
}) => {
  const getAnimationDuration = () => {
    switch(animationSpeed) {
      case "none": return "0s";
      case "slow": return "0.5s";
      case "fast": return "0.15s";
      default: return "0.3s";
    }
  };

  const getThemeStyles = () => {
    const shadowAlpha = shadowIntensity / 100;
    const baseStyles = {
      fontFamily: fontFamily,
      borderRadius: `${borderRadius}px`,
      padding: layout === "compact" ? "12px" : layout === "wide" ? "24px" : "16px",
      border: `2px ${borderStyle} ${accentColor}40`,
      backdropFilter: "blur(12px)",
      boxShadow: `0 8px 32px rgba(0, 0, 0, ${0.3 * shadowAlpha})`,
      background: backgroundColor,
      color: textColor,
      transition: `all ${getAnimationDuration()} ease`,
      maxWidth: layout === "wide" ? "800px" : "600px"
    };

    return baseStyles;
  };

  const getItemStyles = () => {
    const isCompact = layout === "compact";
    const isCards = layout === "cards";
    
    return {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: isCompact ? "8px" : isCards ? "12px" : "10px",
      background: darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
      borderRadius: isCards ? `${borderRadius}px` : "8px",
      borderLeft: isCards ? "none" : `3px solid ${accentColor}`,
      border: isCards ? `1px solid ${accentColor}30` : undefined,
      marginBottom: isCards ? "10px" : "8px",
      transition: `all ${getAnimationDuration()} ease`,
    };
  };

  const getLabelStyles = () => ({
    opacity: 0.7,
    fontSize: layout === "compact" ? "12px" : "14px",
    fontWeight: 500
  });

  const getValueStyles = () => ({
    fontWeight: 600,
    fontSize: layout === "compact" ? "12px" : "14px",
    color: accentColor
  });

  return (
    <div style={getThemeStyles()}>
      {enabledFields.hostname && serverData.hostname && (
        <div style={{ 
          fontSize: layout === "compact" ? "16px" : "18px", 
          fontWeight: 700, 
          marginBottom: layout === "compact" ? "12px" : "16px", 
          color: accentColor,
          textShadow: theme === "neon" ? `0 0 10px ${accentColor}80` : "none"
        }}>
          {serverData.hostname}
        </div>
      )}
      
      <div style={{ 
        display: layout === "cards" ? "grid" : "flex",
        flexDirection: "column",
        gridTemplateColumns: layout === "cards" ? "repeat(auto-fit, minmax(150px, 1fr))" : undefined,
        gap: layout === "cards" ? "10px" : undefined
      }}>
        {enabledFields.map && serverData.map && (
          <div style={getItemStyles()}>
            <span style={getLabelStyles()}>🗺️ Map</span>
            <span style={getValueStyles()}>{serverData.map}</span>
          </div>
        )}
        
        {enabledFields.current_players && serverData.current_players !== undefined && (
          <div style={getItemStyles()}>
            <span style={getLabelStyles()}>👥 Players</span>
            <span style={getValueStyles()}>
              {serverData.current_players}
              {enabledFields.max_players && serverData.max_players !== undefined ? `/${serverData.max_players}` : ""}
            </span>
          </div>
        )}
        
        {!enabledFields.current_players && enabledFields.max_players && serverData.max_players !== undefined && (
          <div style={getItemStyles()}>
            <span style={getLabelStyles()}>Max Players</span>
            <span style={getValueStyles()}>{serverData.max_players}</span>
          </div>
        )}
        
        {enabledFields.game && serverData.game && (
          <div style={getItemStyles()}>
            <span style={getLabelStyles()}>🎮 Game</span>
            <span style={getValueStyles()}>{serverData.game}</span>
          </div>
        )}
        
        {enabledFields.ping && serverData.ping !== undefined && (
          <div style={getItemStyles()}>
            <span style={getLabelStyles()}>📡 Ping</span>
            <span style={getValueStyles()}>{serverData.ping}ms</span>
          </div>
        )}
        
        {enabledFields.password_protected && serverData.password_protected !== undefined && (
          <div style={getItemStyles()}>
            <span style={getLabelStyles()}>🔒 Password</span>
            <span style={getValueStyles()}>{serverData.password_protected ? "Yes" : "No"}</span>
          </div>
        )}
        
        {enabledFields.vac_enabled && serverData.vac_enabled !== undefined && (
          <div style={getItemStyles()}>
            <span style={getLabelStyles()}>🛡️ VAC</span>
            <span style={getValueStyles()}>{serverData.vac_enabled ? "Enabled" : "Disabled"}</span>
          </div>
        )}
        
        {enabledFields.player_list && serverData.player_list && serverData.player_list.length > 0 && (
          <div style={{ ...getItemStyles(), flexDirection: "column", alignItems: "flex-start" }}>
            <span style={{ ...getLabelStyles(), marginBottom: "8px" }}>Active Players</span>
            <div style={{ width: "100%" }}>
              {serverData.player_list.map((player, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "6px",
                    background: darkMode ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.03)",
                    borderRadius: "4px",
                    marginTop: "4px",
                    fontSize: "13px",
                    transition: `all ${getAnimationDuration()} ease`
                  }}
                >
                  {player.name} - Score: {player.score} - Time: {Math.floor(player.duration / 60)}m
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WidgetPreview;
