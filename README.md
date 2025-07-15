# Let Him Shoot

# **The Problem**

In NCAA Basketball, a winning defensive strategy depends on knowing which players are legitimate three-point threats. High percentage shooters require tighter coverage, while weaker shooters can be left open. Manually searching through stats for hundreds of teams and players is a time liability and is easy to mess up. The website that I created solves this problem by delivering a clean, intuitive interface to select teams, analyze players, and visually group their three-point shooting threat into four categories: "Lethal Shooter," "Fifty-Fifty," "Let Him Shoot," or "Unidentified Shooter.” Helping to solve the uncertainty of perimeter defense planning we can save both coaches and GMs time. 

## **Data Sourcing**

The data is pulled from Sportradar API, a trusted source for NCAA Men’s Basketball stats ([Sportradar NCAA Basketball API](https://developer.sportradar.com/basketball/reference/ncaamb-overview)). 

***Teams:*** Sourced from the [teams.json](https://developer.sportradar.com/basketball/reference/ncaamb-teams) endpoint where 1400+ teams and their rosters are listed, providing information like team id, name, alias, and market.

***Team stats**:* Taken from the [statistics.json](https://developer.sportradar.com/basketball/reference/ncaamb-seasonal-statistics) endpoint for the 2024 regular season which provides average statistics for the whole team and its players, includes 3PT%, points per game, TS%, etc.

***Player rosters:*** The most current rosters shown in the [teams.json](https://developer.sportradar.com/basketball/reference/ncaamb-teams) endpoint. 

***Player stats**:* Sourced from [profile.json](https://developer.sportradar.com/basketball/reference/ncaamb-player-profile), includes each player’s profile (id, full name, team id) and statistics like 3PT%, 3Pt attempts per game, rebounds, etc. All the displayed stats are only from the 2024 REG season. 

***Shooting evolution graph:*** Each player’s 3PT% over the last 3 years is displayed in a graph. The data used for this was also sourced from the [profile.json](https://developer.sportradar.com/basketball/reference/ncaamb-player-profile) endpoint, which has a summary of all the seasons that each player has participated in. 

***Data storage**:* Data is stored in a local SQLite database to minimize API calls and keep things organized.

## **How This Was Built**

Here is what was used to make *Let Him Shoot* user-friendly and visually appealing, while being able to handle a lot of data.

***Backend**:*

- Built using Next.js API routes for fetching and storing data.  
- Uses the axios library for API requests to Sportradar.  
- Uses the SQLite database engine for storing team and player data locally.

***Frontend:***

- Built with React and TypeScript.  
- Styled with Tailwind CSS for a modern, responsive UI.  
- The lucide-react package was used for icons and components (Input, Button, Card, Badge)

***Shooter Classification Logic:*** Players are sorted based on their 3PT%.

- **Lethal Shooter**:  ≥37% and ≥2 attempts per game (guard him).  
- **Fifty-Fifty**: 30–36.9% or ≥37% but \<2 attempts per game  (watch him).  
- **Let Him Shoot**: \<30% (he sucks).  
- **Unidentified Shooter**: Too few attempts to judge (\<0.2 threePtAttemptsPerGame).  
  This logic lives in the team’s page.tsx, making it easy to update thresholds if needed.

## **How it’s Useful**

This app takes the manual work out of scouting by automatically analyzing stats across every NCAA team, saving coaches and GMs hours they’d otherwise spend digging through spreadsheets. More importantly, it can instantly spot which players are real three-point threats, so defensive assignments can be smarter and more targeted.


**Check Out the App**

**Link to the code**: [https://github.com/JennaBunescu/Let-Him-Shoot](https://github.com/JennaBunescu/Let-Him-Shoot)

**Link to video demo: [Screen Recording 2025-07-14 at 4.39.47 PM.mov](https://drive.google.com/file/d/1ae6-KAs6MpLjxypmd4HMqyJNhnufNrp5/view?usp=sharing)**

