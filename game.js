// Game State
let gameState = {
    coins: 50,
    animals: {
        chicken: { count: 1, product: 'egg', productValue: 5 }
    },
    machines: {},
    stats: {
        totalCoinsEarned: 0,
        totalAnimalsBought: 1,
        totalMachinesBought: 0,
        totalManualSales: 0
    },
    achievements: {},
    machineLevels: {
        chicken: 1,
        cow: 1,
        sheep: 1
    },
    usedCodes: [],
    playerName: ''
};

// Constants (Replace with your endpoints)
const LEADERBOARD_API = 'https://mines-hjkm.onrender.com';
const SHOP_ITEMS = [
    { name: 'Chicken', price: 10, product: 'egg', productValue: 5 },
    { name: 'Cow', price: 50, product: 'milk', productValue: 20 },
    { name: 'Sheep', price: 30, product: 'wool', productValue: 15 }
];
const AUTOMATION_ITEMS = [
    { type: 'chicken', basePrice: 100 },
    { type: 'cow', basePrice: 500 },
    { type: 'sheep', basePrice: 300 }
];
const AUTOMATION_TIERS = [
    { interval: 15000, priceMultiplier: 1 },
    { interval: 10000, priceMultiplier: 2 },
    { interval: 5000, priceMultiplier: 5 }
];
const ACHIEVEMENTS = [
    { id: 'first_machine', name: 'First Automation', condition: s => s.stats.totalMachinesBought >= 1 },
    { id: 'millionaire', name: 'Coin Millionaire', condition: s => s.coins >= 1000 },
    { id: 'factory_owner', name: 'Factory Owner', condition: s => Object.keys(s.machines).length >= 3 }
];

// Formatting Utilities
function formatCoins(amount) {
    if (amount >= 1e6) return `${(amount/1e6).toFixed(1)}M`;
    if (amount >= 1e3) return `${(amount/1e3).toFixed(1)}K`;
    return amount;
}

// Core Game Functions
window.sellProduct = function(animalType) {
    const animal = gameState.animals[animalType];
    if (animal?.count > 0) {
        const earnings = animal.count * animal.productValue;
        gameState.coins += earnings;
        gameState.stats.totalCoinsEarned += earnings;
        gameState.stats.totalManualSales++;
        createCoinAnimation(event.clientX, event.clientY, earnings);
        updateDisplay();
        submitScore();
    }
};

window.buyAnimal = function(animalType, price) {
    if (gameState.coins >= price) {
        gameState.coins -= price;
        
        if (!gameState.animals[animalType]) {
            const shopItem = SHOP_ITEMS.find(item => item.name.toLowerCase() === animalType);
            gameState.animals[animalType] = {
                count: 0,
                product: shopItem.product,
                productValue: shopItem.productValue
            };
        }
        
        gameState.animals[animalType].count++;
        gameState.stats.totalAnimalsBought++;
        updateDisplay();
        submitScore();
    } else {
        alert('Not enough coins!');
    }
};

window.buyMachine = function(animalType) {
    const currentTier = gameState.machineLevels[animalType];
    if (currentTier > AUTOMATION_TIERS.length) return;

    const machineData = AUTOMATION_TIERS[currentTier - 1];
    const basePrice = AUTOMATION_ITEMS.find(i => i.type === animalType).basePrice;
    const price = basePrice * machineData.priceMultiplier;

    if (gameState.coins >= price) {
        gameState.coins -= price;
        gameState.stats.totalMachinesBought++;
        
        if (gameState.machines[animalType]) {
            clearInterval(gameState.machines[animalType].intervalId);
        }

        gameState.machines[animalType] = {
            level: currentTier,
            interval: machineData.interval,
            intervalId: setInterval(() => autoSell(animalType), machineData.interval)
        };

        gameState.machineLevels[animalType]++;
        updateDisplay();
        submitScore();
    }
};

// Leaderboard Functions
async function submitScore() {
    try {
        const response = await fetch(`${LEADERBOARD_API}/submit-score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: gameState.playerName,
                coins: gameState.coins
            })
        });
        if (!response.ok) throw new Error('Failed to submit score');
    } catch (error) {
        console.error('Score submission error:', error);
    }
}

window.updateLeaderboardDisplay = async function() {
    const leaderboardList = document.getElementById('leaderboard-list');
    const entriesToShow = document.getElementById('leaderboard-entries').value || 10;
    
    try {
        leaderboardList.innerHTML = '<div class="leaderboard-loading">Loading...</div>';
        
        const response = await fetch(`${LEADERBOARD_API}/leaderboard?limit=100`);
        const leaderboard = await response.json();
        
        // Client-side deduplication (safety net)
        const uniqueEntries = leaderboard.reduce((acc, current) => {
            const existing = acc.find(entry => entry.name === current.name);
            if (!existing || current.coins > existing.coins) {
                if (existing) acc.splice(acc.indexOf(existing), 1);
                acc.push(current);
            }
            return acc;
        }, []);

        // Sort and limit entries
        const sortedEntries = uniqueEntries
            .sort((a, b) => b.coins - a.coins)
            .slice(0, entriesToShow);

        // Update display
        leaderboardList.innerHTML = sortedEntries.map((entry, index) => `
            <div class="leaderboard-entry ${entry.name === gameState.playerName ? 'leaderboard-you' : ''}">
                <span>${index + 1}. ${entry.name}</span>
                <span>${formatCoins(entry.coins)}</span>
            </div>
        `).join('');
        
    } catch (error) {
        leaderboardList.innerHTML = '<div class="leaderboard-loading">Error loading leaderboard</div>';
        console.error('Leaderboard error:', error);
    }
};

// Game Utilities
function autoSell(animalType) {
    const animal = gameState.animals[animalType];
    if (animal?.count > 0) {
        const earnings = animal.count * animal.productValue;
        gameState.coins += earnings;
        gameState.stats.totalCoinsEarned += earnings;
        updateDisplay();
    }
}

function createCoinAnimation(x, y, amount) {
    const anim = document.createElement('div');
    anim.className = 'coin-animation';
    anim.textContent = `+${amount}`;
    anim.style.left = `${x}px`;
    anim.style.top = `${y}px`;
    document.body.appendChild(anim);
    setTimeout(() => anim.remove(), 800);
}

// Display Management
function updateDisplay() {
    updateCoinsDisplay();
    updateAnimalsDisplay();
    updateShopDisplay();
    updateAutomationDisplay();
    updateStatsDisplay();
    updateAchievementsDisplay();
}

function updateCoinsDisplay() {
    document.getElementById('coins').textContent = formatCoins(gameState.coins);
}

function updateAnimalsDisplay() {
    const animalsList = document.getElementById('animals-list');
    animalsList.innerHTML = Object.entries(gameState.animals).map(([type, data]) => `
        <div class="animal-card">
            <h3>${type.charAt(0).toUpperCase() + type.slice(1)}s (${data.count})</h3>
            <button onclick="sellProduct('${type}')">
                Sell ${data.product}s (${data.productValue} coins each)
            </button>
        </div>
    `).join('');
}

function updateShopDisplay() {
    const shopItemsDiv = document.getElementById('shop-items');
    shopItemsDiv.innerHTML = SHOP_ITEMS.map(item => `
        <div class="shop-item">
            <h3>${item.name} (${formatCoins(item.price)})</h3>
            <button onclick="buyAnimal('${item.name.toLowerCase()}', ${item.price})">
                Buy ${item.name}
            </button>
        </div>
    `).join('');
}

function updateAutomationDisplay() {
    const automationDiv = document.getElementById('automation-items');
    automationDiv.innerHTML = AUTOMATION_ITEMS.map(item => {
        const currentTier = gameState.machineLevels[item.type];
        const machineData = AUTOMATION_TIERS[currentTier - 1];
        const price = item.basePrice * machineData.priceMultiplier;
        
        return `
            <div class="shop-item">
                <h3>${item.type.toUpperCase()} Auto-Seller Tier ${currentTier}</h3>
                <p>Price: ${formatCoins(price)}</p>
                <p>Sells every ${machineData.interval/1000}s</p>
                <button onclick="buyMachine('${item.type}')" ${currentTier >= AUTOMATION_TIERS.length ? 'disabled' : ''}>
                    ${currentTier < AUTOMATION_TIERS.length ? 'Upgrade' : 'Max Level'}
                </button>
            </div>
        `;
    }).join('');

    const activeMachinesDiv = document.getElementById('active-machines');
    activeMachinesDiv.innerHTML = Object.entries(gameState.machines).map(([type, machine]) => `
        <div class="machine-card">
            <h3>${type.charAt(0).toUpperCase() + type.slice(1)} Auto-Seller</h3>
            <p>Tier ${machine.level} (every ${machine.interval/1000}s)</p>
        </div>
    `).join('');
}

function updateStatsDisplay() {
    const statsDiv = document.getElementById('stats-list');
    statsDiv.innerHTML = `
        <p>Total Earned: ${formatCoins(gameState.stats.totalCoinsEarned)}</p>
        <p>Animals Bought: ${gameState.stats.totalAnimalsBought}</p>
        <p>Machines Bought: ${gameState.stats.totalMachinesBought}</p>
        <p>Manual Sales: ${gameState.stats.totalManualSales}</p>
    `;
}

function updateAchievementsDisplay() {
    const achievementsDiv = document.getElementById('achievements-list');
    achievementsDiv.innerHTML = ACHIEVEMENTS.map(achievement => `
        <div class="achievement-card ${gameState.achievements[achievement.id] ? 'achievement-unlocked' : ''}">
            <h4>${achievement.name}</h4>
            <p>${gameState.achievements[achievement.id] ? 'Unlocked! 🎉' : 'Locked 🔒'}</p>
        </div>
    `).join('');
}

// Save/Load System
function saveGame() {
    const saveData = {
        ...gameState,
        machines: Object.fromEntries(
            Object.entries(gameState.machines).map(([type, machine]) => [
                type, 
                { level: machine.level, interval: machine.interval }
            ])
        )
    };
    localStorage.setItem('farmGameSave', JSON.stringify(saveData));
}

function loadGame() {
    const saved = localStorage.getItem('farmGameSave');
    if (saved) {
        const loaded = JSON.parse(saved);
        gameState = {
            ...gameState,
            ...loaded,
            machines: {}
        };

        Object.entries(loaded.machines || {}).forEach(([type, machine]) => {
            gameState.machines[type] = {
                ...machine,
                intervalId: setInterval(() => autoSell(type), machine.interval)
            };
        });
    }
}

// Achievement System
function checkAchievements() {
    ACHIEVEMENTS.forEach(achievement => {
        if (!gameState.achievements[achievement.id] && achievement.condition(gameState)) {
            gameState.achievements[achievement.id] = true;
            alert(`Achievement Unlocked: ${achievement.name}!`);
        }
    });
}

// Initialization
function initGame() {
    loadGame();
    
    if (!gameState.playerName) {
        gameState.playerName = prompt("Welcome to Farm Game!\nEnter your player name:") || 'Farmer';
        saveGame();
    }

    setInterval(saveGame, 30000);
    window.addEventListener('beforeunload', saveGame);
    checkAchievements();
    updateDisplay();
    updateLeaderboardDisplay();
}

window.onload = initGame;