import React, { useContext } from "react";
import { ThemeContext } from "./ThemeContext";
import "./animations.css";

import cloud1 from "./cloudImages/cloud1.png";
import cloud2 from "./cloudImages/cloud2.png";
import cloud3 from "./cloudImages/cloud3.png";
import cloud4 from "./cloudImages/cloud4.png";
import cloud5 from "./cloudImages/cloud5.png";

// Renamed these constants to avoid shadowing/ReferenceErrors in the component props
const defaultListClouds = [cloud1, cloud2, cloud3, cloud4, cloud5];
const defaultSpeedClouds = [50, 55, 60, 65, 70];

function CloudAnimation({ listClouds = defaultListClouds, speedClouds = defaultSpeedClouds }) {
    const { theme, backgroundEffect, isAnimating } = useContext(ThemeContext);

    function setBackgroundColor() {
        if (backgroundEffect === "clouds") {
            if (theme === "light") {
                return "#87CEEB"; // lighter blue for sky
            } else if (theme === "dark") {
                return "#141852"; // darker blue for sky
            }
        } else {
            if (theme === "light") {
                return "#fdf5e0"; // white for default
            } else if (theme === "dark") {
                return "#000000"; // black for default
            }
        }
    }

    return (
        <>
            {/*Background for the sky*/}
            <div id="background-wrapper"
                style={{ 
                    backgroundColor: setBackgroundColor(),
                    position: "fixed",
                    top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 10, 
                }}
                className={isAnimating ? "fade-out" : "fade-in"} 
            />

            {/*Clouds*/}
            {backgroundEffect === "clouds" && (
                <div style={{ 
                    position: "fixed",
                    top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 30,
                }}>
                    {listClouds.map((cloud, index) => {
                        
                        const cloudClass = `cloud cloud-${index + 1}`; 
                        const isRightToLeft = index % 2 === 0; 
                        
                        return (
                            <div key={index} className={`cloud container ${cloudClass}`} style={{
                                
                                animation: `${isRightToLeft ? 'marqueeRightToLeft' : 'marqueeLeftToRight'} ${speedClouds[index]}s linear infinite`
                            }}>
                                <img src={cloud} alt={`Cloud ${index + 1}`} className="cloud-img"/>
                            </div>
                        )
                    })} 
                </div>
            )}
        </>
    )
}

export default CloudAnimation;