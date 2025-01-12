const fetch = require('node-fetch').default;

async function fetchGameInfo() {
  try {
    // Fetch working.json and titles_db.txt in parallel
    const [workingResponse, titlesResponse] = await Promise.all([
      fetch('https://raw.githubusercontent.com/ghost-land/NX-Missing/refs/heads/main/data/working.json'),
      fetch('https://raw.githubusercontent.com/ghost-land/NX-Missing/refs/heads/main/data/titles_db.txt')
    ]);

    const workingData = await workingResponse.json();
    const titlesText = await titlesResponse.text();

    // Parse titles_db.txt
    const titleInfo = {};
    titlesText.split('\n').forEach(line => {
      const [tid, releaseDate, name, size] = line.split('|');
      if (tid && releaseDate && name) {
        titleInfo[tid] = { name, releaseDate, size: parseInt(size, 10) };
      }
    });

    // Combine both sources
    const gameInfo = {};
    
    // First, add data from working.json
    Object.entries(workingData).forEach(([tid, data]) => {
      gameInfo[tid] = {
        name: data['Game Name'],
        version: data['Version'],
        size: data['Size'],
      };
    });

    // Then supplement with titles_db.txt data
    Object.entries(titleInfo).forEach(([tid, data]) => {
      if (!gameInfo[tid]) {
        gameInfo[tid] = {
          name: data.name,
          size: data.size,
        };
      }
      // Add release date even if we already have other info
      gameInfo[tid].releaseDate = data.releaseDate;
    });

    return gameInfo;
  } catch (error) {
    console.error('Error fetching game info:', error);
    return {};
  }
}

module.exports = {
  fetchGameInfo
};