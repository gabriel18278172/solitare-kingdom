(() => {
    const SUITS = ["spades", "hearts", "diamonds", "clubs"];
    const SUIT_SYMBOL = {
        spades: "♠",
        hearts: "♥",
        diamonds: "♦",
        clubs: "♣",
    };
    const RANKS = [null, "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const TABLEAU_OFFSET_DOWN = 28;
    const TABLEAU_OFFSET_UP = 35;
    const SAVE_KEY = "solitaire-royale-save-v1";
    const SETTINGS_KEY = "solitaire-royale-settings-v1";
    const GAME_CATALOG = {
        klondike: {
            name: "Klondike",
            subtitle: "Classic Klondike • Draw 1",
            description: "Classic draw-one Klondike with polished visuals, richer sound, and helper systems.",
            available: true,
        },
        spider: {
            name: "Spider",
            subtitle: "Spider • 1 Suit",
            description: "Playable one-suit Spider with ten columns, stock row deals, and completed-run clearing.",
            available: true,
        },
        freecell: {
            name: "FreeCell",
            subtitle: "FreeCell • Open Information",
            description: "Four free cells, four foundations, eight columns — all cards face-up. Precision planning at its finest.",
            available: true,
        },
        tripeaks: {
            name: "TriPeaks",
            subtitle: "TriPeaks • Coming Soon",
            description: "Arcade-style clears and combo pacing are being forged next.",
            available: false,
        },
        pyramid: {
            name: "Pyramid",
            subtitle: "Pyramid • Coming Soon",
            description: "Match-to-thirteen structure solving is reserved for a later release.",
            available: false,
        },
        yukon: {
            name: "Yukon",
            subtitle: "Yukon • Coming Soon",
            description: "Loose stack movement and dramatic column planning are in the queue.",
            available: false,
        },
        canfield: {
            name: "Canfield",
            subtitle: "Canfield • Coming Soon",
            description: "Reserve pressure, hard recovery, and tight sequencing are planned next.",
            available: false,
        },
        scorpion: {
            name: "Scorpion",
            subtitle: "Scorpion • Coming Soon",
            description: "Open stack tactics and long sequence clearing will join the kingdom later.",
            available: false,
        },
        hearts: {
            name: "Hearts",
            subtitle: "Hearts • Roadmap",
            description: "Trick-taking tables with score history and elegant round flow are on the roadmap.",
            available: false,
        },
        cribbage: {
            name: "Cribbage",
            subtitle: "Cribbage • Roadmap",
            description: "Pegboard scoring and hand counting are reserved for a future release.",
            available: false,
        },
        mahjong: {
            name: "Mahjong",
            subtitle: "Mahjong • Roadmap",
            description: "Tile-matching puzzle halls will arrive as a calmer kingdom wing.",
            available: false,
        },
        chess: {
            name: "Chess",
            subtitle: "Chess • Roadmap",
            description: "A polished royal board with move history and ranked matches is planned.",
            available: false,
        },
        checkers: {
            name: "Checkers",
            subtitle: "Checkers • Roadmap",
            description: "Fast board play and crisp capture motion are on deck for a later release.",
            available: false,
        },
        backgammon: {
            name: "Backgammon",
            subtitle: "Backgammon • Roadmap",
            description: "Dice, pip racing, and premium leather-board styling are planned ahead.",
            available: false,
        },
    };

    function isSpiderGame(gameId = state.currentGame) {
        return gameId === "spider";
    }

    function isFreeCellGame(gameId = state.currentGame) {
        return gameId === "freecell";
    }

    function getFoundationCount(gameId = state.currentGame) {
        return isSpiderGame(gameId) ? 8 : 4;
    }

    function getTableauCount(gameId = state.currentGame) {
        if (isSpiderGame(gameId)) return 10;
        if (isFreeCellGame(gameId)) return 8;
        return 7;
    }

    function createSpiderDeck() {
        const cards = [];
        let id = 0;
        for (let deck = 0; deck < 8; deck += 1) {
            for (let rank = 1; rank <= 13; rank += 1) {
                cards.push({
                    id: `s${id++}`,
                    suit: "spades",
                    rank,
                    faceUp: false,
                });
            }
        }
        return cards;
    }

    function createDeckForGame(gameId = state.currentGame) {
        return isSpiderGame(gameId) ? createSpiderDeck() : createDeck();
    }

    function canPlaceOnFreeCell(targetPile) {
        return targetPile.length === 0;
    }

    function freeCellSuperMoveCount(targetIsEmpty = false) {
        const ef = state.freeCells.filter((p) => p.length === 0).length;
        const et = state.tableau.filter((p) => p.length === 0).length - (targetIsEmpty ? 1 : 0);
        return (ef + 1) * Math.pow(2, Math.max(0, et));
    }

    function isFreeCellMovableSequence(col, cardIndex) {
        const pile = state.tableau[col];
        for (let i = cardIndex; i < pile.length; i += 1) {
            if (!pile[i].faceUp) {
                return false;
            }
            if (i > cardIndex) {
                if (colorOf(pile[i - 1]) === colorOf(pile[i])) {
                    return false;
                }
                if (pile[i - 1].rank !== pile[i].rank + 1) {
                    return false;
                }
            }
        }
        return true;
    }

    const state = {
        stock: [],
        waste: [],
        foundations: [[], [], [], []],
        tableau: [[], [], [], [], [], [], []],
        selected: null,
        drag: null,
        moves: 0,
        score: 0,
        startedAt: null,
        timerId: null,
        muted: false,
        history: [],
        messageTimer: null,
        hintTimer: null,
        suppressClickUntil: 0,
        lastScore: 0,
        lastMoves: 0,
        pendingLandFx: null,
        settingsOpen: false,
        autosave: true,
        effectsEnabled: true,
        reducedMotion: false,
        volume: 0.8,
        autoFinishing: false,
        currentGame: "klondike",
        setupGame: "klondike",
        pauseStartedAt: null,
        freeCells: [[], [], [], []],
    };

    const el = {
        board: document.getElementById("board"),
        stock: document.getElementById("stock"),
        waste: document.getElementById("waste"),
        stockZone: document.getElementById("stockZone"),
        wasteZone: document.getElementById("wasteZone"),
        foundations: document.getElementById("foundations"),
        tableau: document.getElementById("tableau"),
        time: document.getElementById("time"),
        moves: document.getElementById("moves"),
        score: document.getElementById("score"),
        message: document.getElementById("message"),
        gameSubtitle: document.getElementById("gameSubtitle"),
        newGameBtn: document.getElementById("newGameBtn"),
        homeBtn: document.getElementById("homeBtn"),
        undoBtn: document.getElementById("undoBtn"),
        hintBtn: document.getElementById("hintBtn"),
        soundBtn: document.getElementById("soundBtn"),
        soundOnIcon: document.getElementById("soundOnIcon"),
        soundOffIcon: document.getElementById("soundOffIcon"),
        cardTemplate: document.getElementById("cardTemplate"),
        fxLayer: document.getElementById("fxLayer"),
        autoFinishBtn: document.getElementById("autoFinishBtn"),
        settingsBtn: document.getElementById("settingsBtn"),
        settingsPanel: document.getElementById("settingsPanel"),
        volumeInput: document.getElementById("volumeInput"),
        effectsInput: document.getElementById("effectsInput"),
        reducedMotionInput: document.getElementById("reducedMotionInput"),
        autosaveInput: document.getElementById("autosaveInput"),
        clearSaveBtn: document.getElementById("clearSaveBtn"),
        homeScreen: document.getElementById("homeScreen"),
        continueSavedBtn: document.getElementById("continueSavedBtn"),
        browseGamesBtn: document.getElementById("browseGamesBtn"),
        gameGrid: document.getElementById("gameGrid"),
        setupPanel: document.getElementById("setupPanel"),
        closeSetupBtn: document.getElementById("closeSetupBtn"),
        setupTitle: document.getElementById("setupTitle"),
        setupDescription: document.getElementById("setupDescription"),
        homeEffectsInput: document.getElementById("homeEffectsInput"),
        homeSoundInput: document.getElementById("homeSoundInput"),
        homeMotionInput: document.getElementById("homeMotionInput"),
        homeAutosaveInput: document.getElementById("homeAutosaveInput"),
        startGameBtn: document.getElementById("startGameBtn"),
        setupResumeBtn: document.getElementById("setupResumeBtn"),
        freecells: document.getElementById("freecells"),
    };

    const audio = {
        ctx: null,
        compressor: null,
        ensure() {
            if (!this.ctx) {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                this.compressor = this.ctx.createDynamicsCompressor();
                this.compressor.threshold.value = -22;
                this.compressor.knee.value = 22;
                this.compressor.ratio.value = 8;
                this.compressor.connect(this.ctx.destination);
            }
            return this.ctx;
        },
        beep(type, freq, duration, gain = 0.07, glide = 0, pan = 0) {
            if (state.muted) {
                return;
            }
            const ctx = this.ensure();
            const t0 = ctx.currentTime;
            const osc = ctx.createOscillator();
            const amp = ctx.createGain();
            const panner = ctx.createStereoPanner();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, t0);
            if (glide > 0) {
                osc.frequency.linearRampToValueAtTime(freq + glide, t0 + duration);
            }
            panner.pan.setValueAtTime(Math.max(-0.9, Math.min(0.9, pan)), t0);
            const effectiveGain = Math.max(0.0001, gain * state.volume);
            amp.gain.setValueAtTime(0.0001, t0);
            amp.gain.exponentialRampToValueAtTime(effectiveGain, t0 + 0.01);
            amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
            osc.connect(amp);
            amp.connect(panner);
            panner.connect(this.compressor);
            osc.start(t0);
            osc.stop(t0 + duration + 0.03);
        },
        move() {
            this.beep("triangle", 460, 0.11, 0.055, 20, -0.1);
            setTimeout(() => this.beep("sine", 590, 0.07, 0.04, -15, 0.15), 35);
        },
        deal() {
            this.beep("square", 260, 0.065, 0.045, 70, -0.2);
            setTimeout(() => this.beep("triangle", 320, 0.05, 0.028, 40, 0.2), 26);
        },
        error() {
            this.beep("sawtooth", 180, 0.12, 0.05, -40, 0);
            setTimeout(() => this.beep("sine", 140, 0.09, 0.03, -25, 0), 40);
        },
        foundation() {
            this.beep("triangle", 520, 0.1, 0.055, 80, -0.25);
            setTimeout(() => this.beep("triangle", 760, 0.12, 0.05, 100, 0.25), 60);
        },
        dragStart() {
            this.beep("sine", 300, 0.04, 0.025, 25, 0.05);
        },
        select() {
            this.beep("triangle", 390, 0.06, 0.03, 18, -0.1);
        },
        flip() {
            this.beep("square", 240, 0.045, 0.025, 95, 0.05);
            setTimeout(() => this.beep("triangle", 440, 0.06, 0.03, 45, -0.05), 28);
        },
        recycle() {
            this.beep("square", 210, 0.07, 0.04, 90, -0.15);
            setTimeout(() => this.beep("triangle", 320, 0.08, 0.035, 120, 0.12), 45);
            setTimeout(() => this.beep("triangle", 430, 0.1, 0.035, 130, 0.18), 90);
        },
        hint() {
            this.beep("sine", 520, 0.08, 0.03, 55, -0.18);
            setTimeout(() => this.beep("triangle", 690, 0.1, 0.035, 75, 0.18), 65);
        },
        uiOpen() {
            this.beep("triangle", 420, 0.07, 0.03, 40, 0.08);
        },
        uiClose() {
            this.beep("sine", 340, 0.06, 0.025, -25, -0.08);
        },
        undo() {
            this.beep("triangle", 300, 0.08, 0.04, -30, -0.12);
            setTimeout(() => this.beep("sine", 220, 0.07, 0.03, -20, 0.08), 45);
        },
        newGame() {
            this.beep("triangle", 480, 0.09, 0.04, 50, -0.14);
            setTimeout(() => this.beep("triangle", 620, 0.12, 0.04, 65, 0.08), 70);
        },
        win() {
            this.beep("triangle", 660, 0.16, 0.07, 140, -0.15);
            setTimeout(() => this.beep("triangle", 760, 0.2, 0.07, 90, 0), 120);
            setTimeout(() => this.beep("triangle", 920, 0.26, 0.07, 70, 0.2), 250);
        },
    };

    function popParticlesAt(x, y, color = "#ffe09e", count = 10, spread = 74) {
        if (!el.fxLayer || !state.effectsEnabled) {
            return;
        }
        for (let i = 0; i < count; i += 1) {
            const p = document.createElement("span");
            p.className = "particle";
            const angle = (Math.PI * 2 * i) / count;
            const dist = spread * (0.45 + Math.random() * 0.75);
            const dx = Math.cos(angle) * dist;
            const dy = Math.sin(angle) * dist - 22;
            p.style.left = `${x}px`;
            p.style.top = `${y}px`;
            p.style.setProperty("--dx", `${dx}px`);
            p.style.setProperty("--dy", `${dy}px`);
            p.style.setProperty("--particle-color", color);
            p.style.animationDelay = `${Math.random() * 70}ms`;
            el.fxLayer.appendChild(p);
            p.addEventListener("animationend", () => p.remove(), { once: true });
        }
    }

    function popParticlesAtElement(element, color, count = 10) {
        if (!element) {
            return;
        }
        const rect = element.getBoundingClientRect();
        popParticlesAt(rect.left + rect.width / 2, rect.top + rect.height / 2, color, count);
    }

    function saveSettings() {
        const payload = {
            autosave: state.autosave,
            effectsEnabled: state.effectsEnabled,
            reducedMotion: state.reducedMotion,
            muted: state.muted,
            volume: state.volume,
        };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(payload));
    }

    function applySettingsToUi() {
        el.volumeInput.value = String(Math.round(state.volume * 100));
        el.effectsInput.checked = state.effectsEnabled;
        el.reducedMotionInput.checked = state.reducedMotion;
        el.autosaveInput.checked = state.autosave;
        el.homeEffectsInput.checked = state.effectsEnabled;
        el.homeSoundInput.checked = !state.muted;
        el.homeMotionInput.checked = state.reducedMotion;
        el.homeAutosaveInput.checked = state.autosave;
        el.soundOnIcon.classList.toggle("hidden", state.muted);
        el.soundOffIcon.classList.toggle("hidden", !state.muted);
        document.body.classList.toggle("reduced-motion", state.reducedMotion);
    }

    function hasSavedGame() {
        return Boolean(localStorage.getItem(SAVE_KEY));
    }

    function getSavedGameMeta() {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) {
            return null;
        }
        try {
            const parsed = JSON.parse(raw);
            return {
                currentGame: GAME_CATALOG[parsed.currentGame] ? parsed.currentGame : "klondike",
            };
        } catch {
            localStorage.removeItem(SAVE_KEY);
            return null;
        }
    }

    function updateSubtitle() {
        const game = GAME_CATALOG[state.currentGame] || GAME_CATALOG.klondike;
        el.gameSubtitle.textContent = game.subtitle;
    }

    function pauseGameClock() {
        if (state.timerId) {
            clearInterval(state.timerId);
            state.timerId = null;
        }
        if (state.startedAt && !state.pauseStartedAt) {
            state.pauseStartedAt = Date.now();
        }
    }

    function resumeGameClock() {
        if (state.pauseStartedAt && state.startedAt) {
            state.startedAt += Date.now() - state.pauseStartedAt;
            state.pauseStartedAt = null;
        }
        if (!state.timerId && state.startedAt) {
            state.timerId = setInterval(updateTime, 1000);
        }
    }

    function updateHomeActions() {
        const saveMeta = getSavedGameMeta();
        el.continueSavedBtn.classList.toggle("hidden", !saveMeta);
        el.continueSavedBtn.textContent = saveMeta
            ? `Continue ${GAME_CATALOG[saveMeta.currentGame].name}`
            : "Continue Saved Game";
        el.setupResumeBtn.classList.toggle(
            "hidden",
            !saveMeta || saveMeta.currentGame !== state.setupGame || !GAME_CATALOG[state.setupGame]?.available,
        );
    }

    function syncBoardChrome() {
        const spider = isSpiderGame();
        const freecell = isFreeCellGame();
        const stockLabel = el.stockZone.querySelector(".pile-label");

        el.board.classList.toggle("spider-mode", spider);
        el.board.classList.toggle("freecell-mode", freecell);
        el.foundations.classList.toggle("spider-layout", spider);
        el.tableau.classList.toggle("spider-layout", spider);
        el.tableau.classList.toggle("freecell-layout", freecell);
        el.wasteZone.classList.toggle("hidden", spider || freecell);
        el.stockZone.classList.toggle("hidden", freecell);
        el.freecells.classList.toggle("hidden", !freecell);
        if (stockLabel) {
            stockLabel.textContent = spider ? "Deal Row" : "Stock";
        }
        el.autoFinishBtn.disabled = spider || freecell;
        el.autoFinishBtn.title = (spider || freecell) ? "Auto Finish is available in Klondike" : "Auto Finish";
    }

    function showHomeScreen() {
        pauseGameClock();
        updateHomeActions();
        el.setupPanel.classList.remove("open");
        el.setupPanel.setAttribute("aria-hidden", "true");
        el.homeScreen.classList.remove("hidden");
    }

    function hideHomeScreen() {
        el.homeScreen.classList.add("hidden");
        el.setupPanel.classList.remove("open");
        el.setupPanel.setAttribute("aria-hidden", "true");
        resumeGameClock();
    }

    function openSetupForGame(gameId) {
        const game = GAME_CATALOG[gameId];
        if (!game) {
            showMessage("That table is not available", 1100);
            audio.error();
            return;
        }
        state.setupGame = gameId;
        el.setupTitle.textContent = game.name;
        el.setupDescription.textContent = game.description;
        applySettingsToUi();
        el.startGameBtn.disabled = !game.available;
        el.startGameBtn.textContent = game.available ? "Start Game" : "Coming Soon";
        updateHomeActions();
        el.setupPanel.classList.add("open");
        el.setupPanel.setAttribute("aria-hidden", String(false));
        if (!game.available) {
            audio.error();
        } else {
            audio.uiOpen();
        }
    }

    function applyHomeSetupToState() {
        state.effectsEnabled = el.homeEffectsInput.checked;
        state.muted = !el.homeSoundInput.checked;
        state.reducedMotion = el.homeMotionInput.checked;
        state.autosave = el.homeAutosaveInput.checked;
        applySettingsToUi();
        saveSettings();
    }

    function launchSelectedGame(useSavedGame = false) {
        const game = GAME_CATALOG[state.setupGame] || GAME_CATALOG.klondike;
        if (!game.available) {
            showMessage(`${game.name} is coming soon`, 1400);
            audio.error();
            return;
        }
        applyHomeSetupToState();
        state.currentGame = state.setupGame;
        updateSubtitle();
        if (useSavedGame && hasSavedGame() && loadSavedGame()) {
            render();
        } else {
            newGame();
        }
        hideHomeScreen();
    }

    function loadSettings() {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) {
            applySettingsToUi();
            return;
        }
        try {
            const parsed = JSON.parse(raw);
            state.autosave = parsed.autosave !== false;
            state.effectsEnabled = parsed.effectsEnabled !== false;
            state.reducedMotion = parsed.reducedMotion === true;
            state.muted = parsed.muted === true;
            const v = Number(parsed.volume);
            state.volume = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.8;
        } catch {
            localStorage.removeItem(SETTINGS_KEY);
        }
        applySettingsToUi();
    }

    function serializeGame() {
        return {
            currentGame: state.currentGame,
            stock: state.stock.map(copyCard),
            waste: state.waste.map(copyCard),
            foundations: state.foundations.map((pile) => pile.map(copyCard)),
            tableau: state.tableau.map((pile) => pile.map(copyCard)),
            freeCells: state.freeCells.map((pile) => pile.map(copyCard)),
            moves: state.moves,
            score: state.score,
            startedAt: state.startedAt,
        };
    }

    function saveGame() {
        if (!state.autosave) {
            return;
        }
        localStorage.setItem(SAVE_KEY, JSON.stringify(serializeGame()));
    }

    function loadSavedGame() {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) {
            return false;
        }
        try {
            const parsed = JSON.parse(raw);
            state.currentGame = GAME_CATALOG[parsed.currentGame] ? parsed.currentGame : "klondike";
            state.setupGame = state.currentGame;
            state.stock = parsed.stock.map(copyCard);
            state.waste = parsed.waste.map(copyCard);
            state.foundations = parsed.foundations.map((pile) => pile.map(copyCard));
            state.tableau = parsed.tableau.map((pile) => pile.map(copyCard));
            state.freeCells = parsed.freeCells
                ? parsed.freeCells.map((pile) => pile.map(copyCard))
                : [[], [], [], []];
            state.moves = Number(parsed.moves) || 0;
            state.score = Number(parsed.score) || 0;
            state.startedAt = Number(parsed.startedAt) || Date.now();
            state.lastMoves = state.moves;
            state.lastScore = state.score;
            updateSubtitle();
            showMessage("Resumed saved game", 1200);
            return true;
        } catch {
            localStorage.removeItem(SAVE_KEY);
            return false;
        }
    }

    function clearSavedGame() {
        localStorage.removeItem(SAVE_KEY);
        updateHomeActions();
        showMessage("Saved game cleared", 1000);
    }

    function registerServiceWorker() {
        if (!("serviceWorker" in navigator)) {
            return;
        }
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("./sw.js").catch(() => {
                showMessage("Offline cache unavailable", 1200);
            });
        });
    }

    function createDeck() {
        const cards = [];
        let id = 0;
        for (const suit of SUITS) {
            for (let rank = 1; rank <= 13; rank += 1) {
                cards.push({
                    id: `c${id++}`,
                    suit,
                    rank,
                    faceUp: false,
                });
            }
        }
        return cards;
    }

    function shuffle(deck) {
        for (let i = deck.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    function cloneStateSnapshot() {
        return {
            currentGame: state.currentGame,
            stock: state.stock.map(copyCard),
            waste: state.waste.map(copyCard),
            foundations: state.foundations.map((pile) => pile.map(copyCard)),
            tableau: state.tableau.map((pile) => pile.map(copyCard)),
            freeCells: state.freeCells.map((pile) => pile.map(copyCard)),
            moves: state.moves,
            score: state.score,
            startedAt: state.startedAt,
        };
    }

    function copyCard(card) {
        return {
            id: card.id,
            suit: card.suit,
            rank: card.rank,
            faceUp: card.faceUp,
        };
    }

    function restoreSnapshot(snap) {
        state.currentGame = snap.currentGame || state.currentGame;
        state.stock = snap.stock.map(copyCard);
        state.waste = snap.waste.map(copyCard);
        state.foundations = snap.foundations.map((pile) => pile.map(copyCard));
        state.tableau = snap.tableau.map((pile) => pile.map(copyCard));
        state.freeCells = snap.freeCells
            ? snap.freeCells.map((pile) => pile.map(copyCard))
            : [[], [], [], []];
        state.moves = snap.moves;
        state.score = snap.score;
        state.startedAt = snap.startedAt;
        updateSubtitle();
        clearSelection();
        render();
    }

    function pushHistory() {
        state.history.push(cloneStateSnapshot());
        if (state.history.length > 160) {
            state.history.shift();
        }
    }

    function newGame() {
        clearInterval(state.timerId);
        const deck = shuffle(createDeckForGame());
        state.stock = [];
        state.waste = [];
        state.foundations = Array.from({ length: getFoundationCount() }, () => []);
        state.tableau = Array.from({ length: getTableauCount() }, () => []);
        state.selected = null;
        state.drag = null;
        state.moves = 0;
        state.score = 0;
        state.history = [];
        state.startedAt = Date.now();
        state.autoFinishing = false;
        state.lastMoves = 0;
        state.lastScore = 0;

        if (isSpiderGame()) {
            for (let col = 0; col < 10; col += 1) {
                const cardsToDeal = col < 4 ? 6 : 5;
                for (let row = 0; row < cardsToDeal; row += 1) {
                    const card = deck.pop();
                    card.faceUp = row === cardsToDeal - 1;
                    state.tableau[col].push(card);
                }
            }
        } else if (isFreeCellGame()) {
            state.freeCells = [[], [], [], []];
            for (let col = 0; col < 8; col += 1) {
                const count = col < 4 ? 7 : 6;
                for (let row = 0; row < count; row += 1) {
                    const card = deck.pop();
                    card.faceUp = true;
                    state.tableau[col].push(card);
                }
            }
        } else {
            for (let col = 0; col < 7; col += 1) {
                for (let row = 0; row <= col; row += 1) {
                    const card = deck.pop();
                    card.faceUp = row === col;
                    state.tableau[col].push(card);
                }
            }
        }

        state.stock = deck.map((card) => ({ ...card, faceUp: false }));
        state.timerId = setInterval(updateTime, 1000);
        audio.newGame();
        showMessage(`${GAME_CATALOG[state.currentGame].name} started`, 1300);
        render(true);
        updateStats();
    }

    function updateTime() {
        if (!state.startedAt) {
            return;
        }
        const s = Math.floor((Date.now() - state.startedAt) / 1000);
        const mm = String(Math.floor(s / 60)).padStart(2, "0");
        const ss = String(s % 60).padStart(2, "0");
        el.time.textContent = `${mm}:${ss}`;
    }

    function updateStats() {
        if (state.moves !== state.lastMoves) {
            const box = el.moves.closest("div");
            if (box) {
                box.classList.remove("bump");
                void box.offsetWidth;
                box.classList.add("bump");
            }
        }
        if (state.score !== state.lastScore) {
            const box = el.score.closest("div");
            if (box) {
                box.classList.remove("bump");
                void box.offsetWidth;
                box.classList.add("bump");
            }
        }
        el.moves.textContent = String(state.moves);
        el.score.textContent = String(state.score);
        state.lastMoves = state.moves;
        state.lastScore = state.score;
        updateTime();
    }

    function colorOf(card) {
        return card.suit === "hearts" || card.suit === "diamonds" ? "red" : "black";
    }

    function foundationIndexForSuit(suit) {
        if (isSpiderGame()) {
            return -1;
        }
        return SUITS.indexOf(suit);
    }

    function canPlaceOnTableau(card, targetPile) {
        if (isSpiderGame()) {
            const top = targetPile[targetPile.length - 1];
            if (!top) {
                return true;
            }
            return top.faceUp && top.rank === card.rank + 1;
        }
        const top = targetPile[targetPile.length - 1];
        if (!top) {
            // FreeCell: any card on empty column; Klondike: only King
            return isFreeCellGame() ? true : card.rank === 13;
        }
        return top.faceUp && colorOf(top) !== colorOf(card) && top.rank === card.rank + 1;
    }

    function canPlaceOnFoundation(card, targetPile) {
        if (isSpiderGame()) {
            return false;
        }
        const top = targetPile[targetPile.length - 1];
        if (!top) {
            return card.rank === 1;
        }
        return top.suit === card.suit && top.rank + 1 === card.rank;
    }

    function getPileRef(type, index) {
        switch (type) {
            case "stock":
                return state.stock;
            case "waste":
                return state.waste;
            case "foundation":
                return state.foundations[index];
            case "freecell":
                return state.freeCells[index];
            case "tableau":
                return state.tableau[index];
            default:
                return null;
        }
    }

    function isMovable(source, pile, cardIndex) {
        if (source.type === "stock") {
            return false;
        }
        if (source.type === "waste") {
            return cardIndex === pile.length - 1;
        }
        if (source.type === "foundation") {
            return cardIndex === pile.length - 1;
        }
        if (source.type === "freecell") {
            return pile.length === 1 && cardIndex === 0;
        }
        if (source.type === "tableau") {
            if (cardIndex < 0 || cardIndex >= pile.length) {
                return false;
            }
            if (isFreeCellGame()) {
                if (!isFreeCellMovableSequence(source.index, cardIndex)) {
                    return false;
                }
                const movingLength = pile.length - cardIndex;
                if (movingLength === 1) {
                    return true;
                }
                return freeCellSuperMoveCount(false) >= movingLength;
            }
            if (isSpiderGame()) {
                for (let i = cardIndex; i < pile.length; i += 1) {
                    if (!pile[i].faceUp) {
                        return false;
                    }
                    if (i > cardIndex && pile[i - 1].rank !== pile[i].rank + 1) {
                        return false;
                    }
                }
                return true;
            }
            for (let i = cardIndex; i < pile.length; i += 1) {
                if (!pile[i].faceUp) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }

    function selectSource(source) {
        const pile = getPileRef(source.type, source.index);
        if (!pile) {
            return;
        }
        const card = pile[source.cardIndex];
        if (!card || !card.faceUp) {
            return;
        }
        if (!isMovable(source, pile, source.cardIndex)) {
            return;
        }
        state.selected = source;
        audio.select();
        render();
    }

    function clearSelection() {
        state.selected = null;
    }

    function recycleWasteToStock() {
        if (isSpiderGame()) {
            audio.error();
            return;
        }
        if (state.waste.length === 0) {
            audio.error();
            showMessage("No waste cards to recycle", 1000);
            return;
        }
        pushHistory();
        while (state.waste.length) {
            const card = state.waste.pop();
            card.faceUp = false;
            state.stock.push(card);
        }
        state.score = Math.max(0, state.score - 35);
        state.moves += 1;
        showMessage("Waste moved back to stock", 1200);
        audio.recycle();
        clearSelection();
        render();
    }

    function drawFromStock() {
        if (isFreeCellGame()) {
            return;
        }
        if (isSpiderGame()) {
            if (state.stock.length === 0) {
                audio.error();
                showMessage("No more deal rows", 1000);
                return;
            }
            if (state.tableau.some((pile) => pile.length === 0)) {
                audio.error();
                showMessage("Fill empty columns before dealing a new row", 1400);
                return;
            }
            pushHistory();
            for (let col = 0; col < state.tableau.length; col += 1) {
                const card = state.stock.pop();
                card.faceUp = true;
                state.tableau[col].push(card);
            }
            state.moves += 1;
            showMessage("New Spider row dealt", 1100);
            audio.deal();
            clearSelection();
            render();
            checkWin();
            return;
        }

        if (state.stock.length > 0) {
            pushHistory();
            const card = state.stock.pop();
            card.faceUp = true;
            state.waste.push(card);
            state.moves += 1;
            state.score += 5;
            audio.deal();
        } else if (state.waste.length > 0) {
            showMessage("Use the reset button on waste to recycle", 1300);
            audio.error();
        } else {
            audio.error();
            showMessage("No cards to draw", 900);
        }
        clearSelection();
        render();
    }

    function autoFlipTableau(colIndex) {
        const pile = state.tableau[colIndex];
        const top = pile[pile.length - 1];
        if (top && !top.faceUp) {
            top.faceUp = true;
            state.score += 5;
            audio.flip();
        }
    }

    function resolveSpiderCompletedRuns(colIndex) {
        if (!isSpiderGame() || colIndex < 0 || colIndex >= state.tableau.length) {
            return false;
        }
        const pile = state.tableau[colIndex];
        let completed = false;

        while (pile.length >= 13) {
            const start = pile.length - 13;
            const run = pile.slice(start);
            const valid =
                run[0].rank === 13 &&
                run[run.length - 1].rank === 1 &&
                run.every((card) => card.faceUp) &&
                run.every((card, idx) => idx === 0 || run[idx - 1].rank === card.rank + 1);

            if (!valid) {
                break;
            }

            const completedRun = pile.splice(start, 13);
            const foundationIndex = state.foundations.findIndex((slot) => slot.length === 0);
            if (foundationIndex >= 0) {
                state.foundations[foundationIndex] = completedRun.map(copyCard);
                state.pendingLandFx = { type: "foundation", index: foundationIndex };
            }
            state.score += 100;
            completed = true;
            autoFlipTableau(colIndex);
            audio.foundation();
        }

        return completed;
    }

    function tryMove(source, target) {
        if (!source || !target) {
            return false;
        }
        if (source.type === target.type && source.index === target.index) {
            return false;
        }

        const sourcePile = getPileRef(source.type, source.index);
        const targetPile = getPileRef(target.type, target.index);
        if (!sourcePile || !targetPile) {
            return false;
        }

        const moving = sourcePile.slice(source.cardIndex);
        if (moving.length < 1) {
            return false;
        }

        if (target.type === "foundation" && moving.length !== 1) {
            return false;
        }

        if (target.type === "freecell" && moving.length !== 1) {
            audio.error();
            showMessage("Only single cards can go to free cells", 1000);
            return false;
        }

        const lead = moving[0];
        let valid = false;

        if (target.type === "tableau") {
            valid = canPlaceOnTableau(lead, targetPile);
        } else if (target.type === "foundation") {
            valid = canPlaceOnFoundation(lead, targetPile);
        } else if (target.type === "freecell") {
            valid = canPlaceOnFreeCell(targetPile);
        }

        if (!valid) {
            audio.error();
            showMessage("Invalid move", 700);
            return false;
        }

        // FreeCell super-move check for multi-card sequences
        if (isFreeCellGame() && source.type === "tableau" && target.type === "tableau" && moving.length > 1) {
            const targetIsEmpty = targetPile.length === 0;
            if (freeCellSuperMoveCount(targetIsEmpty) < moving.length) {
                audio.error();
                showMessage("Not enough free cells for that move", 1300);
                return false;
            }
        }

        pushHistory();
        sourcePile.splice(source.cardIndex, moving.length);
        targetPile.push(...moving);

        if (source.type === "tableau") {
            autoFlipTableau(source.index);
        }

        let spiderCompleted = false;
        if (isSpiderGame()) {
            if (source.type === "tableau") {
                spiderCompleted = resolveSpiderCompletedRuns(source.index) || spiderCompleted;
            }
            if (target.type === "tableau") {
                spiderCompleted = resolveSpiderCompletedRuns(target.index) || spiderCompleted;
            }
        }

        state.moves += 1;
        if (target.type === "foundation") {
            state.score += 15;
            audio.foundation();
        } else if (target.type === "freecell") {
            state.score = Math.max(0, state.score - 1);
        } else if (source.type === "foundation" && target.type === "tableau") {
            state.score = Math.max(0, state.score - 12);
        } else if (source.type === "freecell" && target.type === "tableau") {
            state.score += 5;
        } else {
            state.score += isSpiderGame() ? 5 : 7;
        }

        if (!spiderCompleted) {
            state.pendingLandFx = { type: target.type, index: target.index };
        }

        clearSelection();
        if (target.type !== "foundation") {
            audio.move();
        }
        render();
        checkWin();
        return true;
    }

    function moveSelectionToTarget(target) {
        if (!state.selected) {
            return false;
        }
        return tryMove(state.selected, target);
    }

    function tryAutoMoveToFoundation(source) {
        if (isSpiderGame()) {
            return false;
        }
        const sourcePile = getPileRef(source.type, source.index);
        if (!sourcePile) {
            return false;
        }
        const card = sourcePile[source.cardIndex];
        if (!card) {
            return false;
        }
        const fIndex = foundationIndexForSuit(card.suit);
        const target = { type: "foundation", index: fIndex, cardIndex: 0 };
        return tryMove(source, target);
    }

    function checkWin() {
        const won = isSpiderGame()
            ? state.foundations.length === 8 && state.foundations.every((pile) => pile.length === 13)
            : state.foundations.every((pile) => pile.length === 13);
        if (won) {
            showMessage("Victory achieved", 3000);
            el.board.classList.add("win-flash");
            const rect = el.board.getBoundingClientRect();
            for (let i = 0; i < 5; i += 1) {
                setTimeout(() => {
                    const x = rect.left + 60 + Math.random() * (rect.width - 120);
                    const y = rect.top + 60 + Math.random() * (rect.height - 120);
                    popParticlesAt(x, y, "#ffd16b", 22, 120);
                }, i * 130);
            }
            setTimeout(() => el.board.classList.remove("win-flash"), 750);
            audio.win();
        }
    }

    function showMessage(text, duration = 1100) {
        clearTimeout(state.messageTimer);
        el.message.textContent = text;
        el.message.classList.remove("impact");
        void el.message.offsetWidth;
        el.message.classList.add("impact");
        el.message.classList.add("show");
        state.messageTimer = setTimeout(() => {
            el.message.classList.remove("show");
        }, duration);
    }

    function rankLabel(rank) {
        return RANKS[rank] || String(rank);
    }

    function createCardElement(card, source, cardIndex, animateDeal = false) {
        const node = el.cardTemplate.content.firstElementChild.cloneNode(true);
        node.dataset.cardId = card.id;
        node.dataset.sourceType = source.type;
        node.dataset.sourceIndex = String(source.index ?? -1);
        node.dataset.cardIndex = String(cardIndex);

        if (!card.faceUp) {
            node.classList.add("face-down");
        }

        const color = colorOf(card);
        node.classList.add(color);

        const rankEls = node.querySelectorAll(".rank");
        const suitEls = node.querySelectorAll(".suit");
        const pipEl = node.querySelector(".pip");
        const labelRank = rankLabel(card.rank);
        const symbol = SUIT_SYMBOL[card.suit];

        rankEls.forEach((r) => {
            r.textContent = labelRank;
        });
        suitEls.forEach((s) => {
            s.textContent = symbol;
        });
        pipEl.textContent = symbol;

        if (animateDeal) {
            node.classList.add("deal");
            node.style.animationDelay = `${Math.min(1800, cardIndex * 45)}ms`;
        }

        if (state.selected && isSourceMatch(state.selected, source, cardIndex)) {
            node.classList.add("selected");
        }

        return node;
    }

    function isSourceMatch(selected, source, cardIndex) {
        return (
            selected.type === source.type &&
            selected.index === source.index &&
            selected.cardIndex === cardIndex
        );
    }

    function clearBoard() {
        el.stock.innerHTML = "";
        el.waste.innerHTML = "";
        el.foundations.innerHTML = "";
        el.tableau.innerHTML = "";
        el.freecells.innerHTML = "";
    }

    function render(animateDeal = false) {
        syncBoardChrome();
        clearBoard();
        renderStock(animateDeal);
        renderWaste();
        renderFreeCells();
        renderFoundations();
        renderTableau(animateDeal);
        bindCardEvents();
        applyPendingLandFx();
        updateStats();
        saveGame();
    }

    function applyPendingLandFx() {
        if (!state.pendingLandFx) {
            return;
        }
        const fx = state.pendingLandFx;
        const selector = `[data-pile-type='${fx.type}'][data-pile-index='${fx.index}']`;
        const targetEl = document.querySelector(selector);
        const topCard = targetEl?.querySelector(".card[data-card-id]:last-of-type");
        if (topCard) {
            topCard.classList.remove("land-pop");
            void topCard.offsetWidth;
            topCard.classList.add("land-pop");
        }
        if (fx.type === "foundation") {
            if (targetEl) {
                targetEl.classList.remove("pulse");
                void targetEl.offsetWidth;
                targetEl.classList.add("pulse");
                popParticlesAtElement(targetEl, "#ffd98c", 13);
            }
        } else if (fx.type === "tableau") {
            if (targetEl) {
                targetEl.classList.remove("pulse");
                void targetEl.offsetWidth;
                targetEl.classList.add("pulse");
            }
        }
        state.pendingLandFx = null;
    }

    function renderStock(animateDeal) {
        if (state.stock.length === 0) {
            el.stock.classList.remove("has-cards");
            return;
        }
        const top = state.stock[state.stock.length - 1];
        const cardEl = createCardElement(top, { type: "stock", index: 0 }, state.stock.length - 1, animateDeal);
        cardEl.classList.add("hoverable");
        cardEl.classList.add("face-down");
        cardEl.style.top = "0";
        cardEl.style.left = "0";
        el.stock.appendChild(cardEl);
    }

    function renderWaste() {
        if (isSpiderGame()) {
            return;
        }
        if (!state.waste.length) {
            return;
        }
        const topIndex = state.waste.length - 1;
        const top = state.waste[topIndex];
        const source = { type: "waste", index: 0 };
        const cardEl = createCardElement(top, source, topIndex);
        cardEl.classList.add("hoverable");
        cardEl.style.top = "0";
        cardEl.style.left = "0";
        el.waste.appendChild(cardEl);

        if (state.stock.length === 0) {
            const recycleBtn = document.createElement("button");
            recycleBtn.className = "waste-reset-btn";
            recycleBtn.type = "button";
            recycleBtn.title = "Recycle waste into stock";
            recycleBtn.setAttribute("aria-label", "Recycle waste into stock");
            recycleBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V2L8 6l4 4V7c2.76 0 5 2.24 5 5a5 5 0 11-8.66-3.46L6.93 7.12A7 7 0 1012 5z"/></svg>';
            recycleBtn.onclick = (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                recycleWasteToStock();
            };
            el.waste.appendChild(recycleBtn);
        }
    }

    function renderFreeCells() {
        if (!isFreeCellGame()) {
            return;
        }
        for (let i = 0; i < 4; i += 1) {
            const zone = document.createElement("div");
            zone.className = "pile-zone";
            const label = document.createElement("div");
            label.className = "pile-label";
            label.textContent = `Free ${i + 1}`;
            const pile = document.createElement("div");
            pile.className = "pile freecell-pile";
            pile.dataset.pileType = "freecell";
            pile.dataset.pileIndex = String(i);
            zone.appendChild(label);
            zone.appendChild(pile);

            const cards = state.freeCells[i];
            if (cards.length > 0) {
                const card = cards[0];
                const cardEl = createCardElement(card, { type: "freecell", index: i }, 0);
                cardEl.classList.add("hoverable");
                cardEl.style.top = "0";
                cardEl.style.left = "0";
                pile.appendChild(cardEl);
            }
            el.freecells.appendChild(zone);
        }
    }

    function renderFoundations() {
        for (let i = 0; i < getFoundationCount(); i += 1) {
            const zone = document.createElement("div");
            zone.className = "pile-zone";
            const label = document.createElement("div");
            label.className = "pile-label";
            label.textContent = isSpiderGame() ? `Completed ${i + 1}` : `Foundation ${i + 1}`;
            const pile = document.createElement("div");
            pile.className = "pile foundation";
            pile.dataset.pileType = "foundation";
            pile.dataset.pileIndex = String(i);
            zone.appendChild(label);
            zone.appendChild(pile);

            const cards = state.foundations[i];
            if (cards.length > 0) {
                if (isSpiderGame()) {
                    const badge = document.createElement("div");
                    badge.className = "pile-complete-badge";
                    badge.textContent = "Run";
                    pile.appendChild(badge);
                } else {
                    const topIndex = cards.length - 1;
                    const card = cards[topIndex];
                    const cardEl = createCardElement(card, { type: "foundation", index: i }, topIndex);
                    cardEl.classList.add("hoverable");
                    cardEl.style.top = "0";
                    cardEl.style.left = "0";
                    pile.appendChild(cardEl);
                }
            }
            el.foundations.appendChild(zone);
        }
    }

    function renderTableau(animateDeal) {
        for (let col = 0; col < state.tableau.length; col += 1) {
            const colEl = document.createElement("div");
            colEl.className = "tableau-col";
            colEl.dataset.pileType = "tableau";
            colEl.dataset.pileIndex = String(col);

            const slot = document.createElement("div");
            slot.className = "tableau-slot";
            colEl.appendChild(slot);

            let y = 0;
            const pile = state.tableau[col];
            for (let i = 0; i < pile.length; i += 1) {
                const card = pile[i];
                const cardEl = createCardElement(card, { type: "tableau", index: col }, i, animateDeal);
                if (i === pile.length - 1) {
                    cardEl.classList.add("hoverable");
                }
                cardEl.style.left = "0";
                cardEl.style.top = `${y}px`;
                y += card.faceUp ? TABLEAU_OFFSET_UP : TABLEAU_OFFSET_DOWN;
                colEl.appendChild(cardEl);
            }

            colEl.style.minHeight = `${Math.max(170, y + 130)}px`;
            el.tableau.appendChild(colEl);
        }
    }

    function bindCardEvents() {
        el.stock.onclick = () => {
            drawFromStock();
        };

        const dropZoneSelector = isSpiderGame()
            ? "[data-pile-type='tableau'], .tableau-col"
            : isFreeCellGame()
                ? "[data-pile-type='tableau'], [data-pile-type='foundation'], [data-pile-type='freecell'], .tableau-col"
                : "[data-pile-type='tableau'], [data-pile-type='foundation'], .tableau-col";

        const cards = document.querySelectorAll(".card[data-card-id]");
        cards.forEach((cardEl) => {
            const source = {
                type: cardEl.dataset.sourceType,
                index: Number(cardEl.dataset.sourceIndex),
                cardIndex: Number(cardEl.dataset.cardIndex),
            };

            cardEl.onpointerdown = (ev) => handlePointerDown(ev, source, cardEl);

            cardEl.onclick = (ev) => {
                ev.stopPropagation();
                if (performance.now() < state.suppressClickUntil) {
                    return;
                }
                if (source.type === "stock") {
                    drawFromStock();
                    return;
                }
                handleCardClick(source);
            };

            cardEl.ondblclick = (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                if (source.type === "foundation" || source.type === "stock") {
                    return;
                }
                if (!tryAutoMoveToFoundation(source)) {
                    audio.error();
                }
            };
        });

        const dropZones = document.querySelectorAll(dropZoneSelector);
        dropZones.forEach((zone) => {
            zone.onclick = (ev) => {
                ev.stopPropagation();
                const target = targetFromZone(zone);
                if (target) {
                    moveSelectionToTarget(target);
                }
            };
        });

        document.body.onclick = (ev) => {
            if (el.settingsPanel.contains(ev.target)) {
                return;
            }
            if (state.selected) {
                clearSelection();
                render();
            }
        };
    }

    function handleCardClick(source) {
        const pile = getPileRef(source.type, source.index);
        if (!pile) {
            return;
        }
        const card = pile[source.cardIndex];
        if (!card || !card.faceUp) {
            return;
        }

        if (state.selected) {
            const moved = moveSelectionToTarget({ type: source.type === "tableau" ? "tableau" : source.type, index: source.index, cardIndex: source.cardIndex });
            if (!moved) {
                if (isSourceMatch(state.selected, source, source.cardIndex)) {
                    clearSelection();
                    render();
                } else {
                    selectSource(source);
                }
            }
        } else {
            selectSource(source);
        }
    }

    function targetFromZone(zone) {
        const type = zone.dataset.pileType;
        const index = Number(zone.dataset.pileIndex || 0);
        if (type === "tableau") {
            return { type: "tableau", index, cardIndex: 0 };
        }
        if (type === "foundation") {
            return { type: "foundation", index, cardIndex: 0 };
        }
        if (type === "freecell") {
            return { type: "freecell", index, cardIndex: 0 };
        }
        return null;
    }

    function handlePointerDown(ev, source, cardEl) {
        if (ev.button !== 0) {
            return;
        }
        ev.preventDefault();
        const pile = getPileRef(source.type, source.index);
        if (!pile || !isMovable(source, pile, source.cardIndex)) {
            return;
        }
        audio.dragStart();

        const movingCards = pile.slice(source.cardIndex);
        const dragLayer = document.createElement("div");
        dragLayer.className = "drag-layer";
        const stack = document.createElement("div");
        stack.className = "drag-stack";
        dragLayer.appendChild(stack);
        document.body.appendChild(dragLayer);

        movingCards.forEach((card, i) => {
            const cardGhost = createCardElement(card, source, source.cardIndex + i);
            cardGhost.style.left = "0";
            cardGhost.style.top = `${i * TABLEAU_OFFSET_UP}px`;
            cardGhost.style.pointerEvents = "none";
            stack.appendChild(cardGhost);
        });

        const rect = cardEl.getBoundingClientRect();
        const startX = ev.clientX;
        const startY = ev.clientY;
        const offsetX = ev.clientX - rect.left;
        const offsetY = ev.clientY - rect.top;

        cardEl.classList.add("drag-source");

        state.drag = {
            source,
            dragLayer,
            stack,
            cardEl,
            moved: false,
        };

        positionStack(startX, startY, offsetX, offsetY);

        const onMove = (moveEv) => {
            state.drag.moved = true;
            positionStack(moveEv.clientX, moveEv.clientY, offsetX, offsetY);
            highlightDropTarget(moveEv.clientX, moveEv.clientY);
        };

        const onUp = (upEv) => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            finishDrag(upEv.clientX, upEv.clientY);
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
    }

    function positionStack(x, y, offsetX, offsetY) {
        if (!state.drag) {
            return;
        }
        state.drag.stack.style.left = `${x - offsetX}px`;
        state.drag.stack.style.top = `${y - offsetY}px`;
    }

    function clearHighlights() {
        document.querySelectorAll(".drop-target").forEach((n) => n.classList.remove("drop-target"));
    }

    function highlightDropTarget(x, y) {
        clearHighlights();
        const hit = document.elementFromPoint(x, y);
        const selector = isSpiderGame()
            ? "[data-pile-type='tableau'], .tableau-col"
            : isFreeCellGame()
                ? "[data-pile-type='tableau'], [data-pile-type='foundation'], [data-pile-type='freecell'], .tableau-col"
                : "[data-pile-type='tableau'], [data-pile-type='foundation'], .tableau-col";
        const zone = hit?.closest(selector);
        if (!zone) {
            return;
        }
        const target = targetFromZone(zone);
        if (!target || !state.drag) {
            return;
        }
        const source = state.drag.source;
        const sourcePile = getPileRef(source.type, source.index);
        if (!sourcePile) {
            return;
        }
        const moving = sourcePile.slice(source.cardIndex);
        if (!moving.length) {
            return;
        }

        const lead = moving[0];
        const targetPile = getPileRef(target.type, target.index);
        if (!targetPile) {
            return;
        }

        const ok =
            (target.type === "tableau" && canPlaceOnTableau(lead, targetPile)) ||
            (target.type === "foundation" && moving.length === 1 && canPlaceOnFoundation(lead, targetPile)) ||
            (target.type === "freecell" && moving.length === 1 && canPlaceOnFreeCell(targetPile));

        if (ok) {
            zone.classList.add("drop-target");
        }
    }

    function finishDrag(x, y) {
        if (!state.drag) {
            return;
        }

        const drag = state.drag;
        const hit = document.elementFromPoint(x, y);
        const selector = isSpiderGame()
            ? "[data-pile-type='tableau'], .tableau-col"
            : isFreeCellGame()
                ? "[data-pile-type='tableau'], [data-pile-type='foundation'], [data-pile-type='freecell'], .tableau-col"
                : "[data-pile-type='tableau'], [data-pile-type='foundation'], .tableau-col";
        const zone = hit?.closest(selector);
        let moved = false;

        if (zone) {
            const target = targetFromZone(zone);
            moved = tryMove(drag.source, target);
        }

        clearHighlights();
        drag.cardEl.classList.remove("drag-source");
        drag.dragLayer.remove();
        if (drag.moved) {
            state.suppressClickUntil = performance.now() + 180;
        }
        state.drag = null;

        if (!moved) {
            render();
        }
    }

    function undoMove() {
        const last = state.history.pop();
        if (!last) {
            showMessage("Nothing to undo", 850);
            audio.error();
            return;
        }
        restoreSnapshot(last);
        showMessage("Move undone", 900);
        audio.undo();
    }

    function getLegalMoves() {
        if (isSpiderGame()) {
            const moves = [];
            for (let col = 0; col < state.tableau.length; col += 1) {
                const pile = state.tableau[col];
                for (let idx = 0; idx < pile.length; idx += 1) {
                    const card = pile[idx];
                    const source = { type: "tableau", index: col, cardIndex: idx };
                    if (!card.faceUp || !isMovable(source, pile, idx)) {
                        continue;
                    }
                    for (let targetIndex = 0; targetIndex < state.tableau.length; targetIndex += 1) {
                        if (targetIndex === col) {
                            continue;
                        }
                        if (canPlaceOnTableau(card, state.tableau[targetIndex])) {
                            moves.push({ source, target: { type: "tableau", index: targetIndex, cardIndex: 0 } });
                        }
                    }
                }
            }
            return moves;
        }

        if (isFreeCellGame()) {
            const moves = [];
            // Freecell → foundation / tableau
            for (let fc = 0; fc < 4; fc += 1) {
                if (state.freeCells[fc].length === 0) {
                    continue;
                }
                const card = state.freeCells[fc][0];
                const source = { type: "freecell", index: fc, cardIndex: 0 };
                const f = foundationIndexForSuit(card.suit);
                if (canPlaceOnFoundation(card, state.foundations[f])) {
                    moves.push({ source, target: { type: "foundation", index: f, cardIndex: 0 } });
                }
                for (let t = 0; t < 8; t += 1) {
                    if (canPlaceOnTableau(card, state.tableau[t])) {
                        moves.push({ source, target: { type: "tableau", index: t, cardIndex: 0 } });
                    }
                }
            }
            // Tableau → foundation / freecell / tableau
            const hasEmptyFreeCell = state.freeCells.some((p) => p.length === 0);
            for (let col = 0; col < 8; col += 1) {
                const pile = state.tableau[col];
                if (!pile.length) {
                    continue;
                }
                // Top card to foundation
                const topCard = pile[pile.length - 1];
                const topSource = { type: "tableau", index: col, cardIndex: pile.length - 1 };
                const f = foundationIndexForSuit(topCard.suit);
                if (canPlaceOnFoundation(topCard, state.foundations[f])) {
                    moves.push({ source: topSource, target: { type: "foundation", index: f, cardIndex: 0 } });
                }
                // Top card to free cell
                if (hasEmptyFreeCell) {
                    const fcTarget = state.freeCells.findIndex((p) => p.length === 0);
                    if (fcTarget >= 0) {
                        moves.push({ source: topSource, target: { type: "freecell", index: fcTarget, cardIndex: 0 } });
                    }
                }
                // Sequences to other tableau columns
                for (let idx = 0; idx < pile.length; idx += 1) {
                    const card = pile[idx];
                    const source = { type: "tableau", index: col, cardIndex: idx };
                    if (!isFreeCellMovableSequence(col, idx)) {
                        continue;
                    }
                    const movingLength = pile.length - idx;
                    for (let t = 0; t < 8; t += 1) {
                        if (t === col) {
                            continue;
                        }
                        if (!canPlaceOnTableau(card, state.tableau[t])) {
                            continue;
                        }
                        const targetIsEmpty = state.tableau[t].length === 0;
                        if (freeCellSuperMoveCount(targetIsEmpty) >= movingLength) {
                            moves.push({ source, target: { type: "tableau", index: t, cardIndex: 0 } });
                        }
                    }
                }
            }
            return moves;
        }

        const moves = [];

        if (state.waste.length) {
            const source = { type: "waste", index: 0, cardIndex: state.waste.length - 1 };
            const card = state.waste[state.waste.length - 1];
            for (let i = 0; i < 7; i += 1) {
                if (canPlaceOnTableau(card, state.tableau[i])) {
                    moves.push({ source, target: { type: "tableau", index: i, cardIndex: 0 } });
                }
            }
            const f = foundationIndexForSuit(card.suit);
            if (canPlaceOnFoundation(card, state.foundations[f])) {
                moves.push({ source, target: { type: "foundation", index: f, cardIndex: 0 } });
            }
        }

        for (let col = 0; col < 7; col += 1) {
            const pile = state.tableau[col];
            for (let idx = 0; idx < pile.length; idx += 1) {
                const card = pile[idx];
                if (!card.faceUp) {
                    continue;
                }
                const source = { type: "tableau", index: col, cardIndex: idx };

                if (idx === pile.length - 1) {
                    const f = foundationIndexForSuit(card.suit);
                    if (canPlaceOnFoundation(card, state.foundations[f])) {
                        moves.push({ source, target: { type: "foundation", index: f, cardIndex: 0 } });
                    }
                }

                for (let t = 0; t < 7; t += 1) {
                    if (t === col) {
                        continue;
                    }
                    if (canPlaceOnTableau(card, state.tableau[t])) {
                        moves.push({ source, target: { type: "tableau", index: t, cardIndex: 0 } });
                    }
                }
            }
        }

        return moves;
    }

    function describeLocation(ref) {
        if (ref.type === "waste") {
            return "waste";
        }
        if (ref.type === "foundation") {
            return `foundation ${ref.index + 1}`;
        }
        if (ref.type === "tableau") {
            return `tableau ${ref.index + 1}`;
        }
        if (ref.type === "freecell") {
            return `free cell ${ref.index + 1}`;
        }
        return ref.type;
    }

    function scoreHintMove(move) {
        if (isSpiderGame()) {
            const sourcePile = getPileRef(move.source.type, move.source.index);
            const targetPile = getPileRef(move.target.type, move.target.index);
            const revealCard = sourcePile[move.source.cardIndex - 1];
            const movingLength = sourcePile.length - move.source.cardIndex;
            let score = 35 + Math.min(36, movingLength * 8);
            if (revealCard && !revealCard.faceUp) {
                score += 60;
            }
            if (targetPile.length === 0) {
                score += 24;
            }
            return score;
        }

        if (isFreeCellGame()) {
            let score = 0;
            if (move.target.type === "foundation") {
                score += 130;
            } else if (move.source.type === "freecell" && move.target.type === "tableau") {
                score += 80; // move out of free cell
            } else if (move.source.type === "tableau" && move.target.type === "freecell") {
                score += 10; // parking
            } else if (move.target.type === "tableau") {
                const movingLength = state.tableau[move.source.index].length - move.source.cardIndex;
                score += 30 + Math.min(30, movingLength * 6);
                if (state.tableau[move.target.index].length === 0) {
                    score += 15;
                }
            }
            return score;
        }

        const sourcePile = getPileRef(move.source.type, move.source.index);
        const sourceCard = sourcePile?.[move.source.cardIndex];
        let score = 0;

        if (move.target.type === "foundation") {
            score += move.source.type === "waste" ? 120 : 100;
        }

        if (move.target.type === "tableau") {
            score += move.source.type === "waste" ? 70 : 50;
            const targetPile = state.tableau[move.target.index];
            if (!targetPile.length && sourceCard?.rank === 13) {
                score += 18;
            }
            if (move.source.type === "tableau") {
                const sourceTableau = state.tableau[move.source.index];
                const revealCard = sourceTableau[move.source.cardIndex - 1];
                if (revealCard && !revealCard.faceUp) {
                    score += 45;
                }
            }
        }

        if (move.source.type === "tableau") {
            score += Math.max(0, 12 - move.source.cardIndex);
        }

        return score;
    }

    function clearHintHighlights() {
        clearTimeout(state.hintTimer);
        document.querySelectorAll(".hint-source, .hint-target").forEach((node) => {
            node.classList.remove("hint-source", "hint-target");
        });
    }

    function highlightHintMove(move) {
        clearHintHighlights();

        const sourceSelector = `[data-source-type='${move.source.type}'][data-source-index='${move.source.index}'][data-card-index='${move.source.cardIndex}']`;
        const sourceEl = document.querySelector(sourceSelector);
        const targetSelector = `[data-pile-type='${move.target.type}'][data-pile-index='${move.target.index}']`;
        const targetEl = document.querySelector(targetSelector);

        sourceEl?.classList.add("hint-source");
        targetEl?.classList.add("hint-target");
        if (sourceEl) {
            sourceEl.scrollIntoView({ block: "nearest", inline: "nearest" });
        }

        state.hintTimer = setTimeout(() => {
            clearHintHighlights();
        }, 1900);
    }

    function highlightStockHint() {
        clearHintHighlights();
        el.stock.classList.add("hint-target");
        state.hintTimer = setTimeout(() => {
            el.stock.classList.remove("hint-target");
        }, 1500);
    }

    const UNITY_GAME_ID_ANDROID = "6104970";
    const UNITY_GAME_ID_IOS = "6104971";
    const UNITY_AD_UNIT = "Rewarded_Android";

    function initUnityAds() {
        if (typeof Capacitor === "undefined" || !Capacitor.isNativePlatform()) return;
        import("capacitor-unity-ads").then(({ UnityAds }) => {
            const gameId = Capacitor.getPlatform() === "ios" ? UNITY_GAME_ID_IOS : UNITY_GAME_ID_ANDROID;
            UnityAds.initialize({ gameId, testMode: false }).then(() => {
                UnityAds.load({ adUnitId: UNITY_AD_UNIT });
            }).catch(() => { });
        }).catch(() => { });
    }

    function showAdInterstitial(onDone) {
        // Native app: use real Unity rewarded ad
        if (typeof Capacitor !== "undefined" && Capacitor.isNativePlatform()) {
            import("capacitor-unity-ads").then(({ UnityAds }) => {
                const adUnit = Capacitor.getPlatform() === "ios" ? "Rewarded_iOS" : "Rewarded_Android";
                UnityAds.show({ adUnitId: adUnit }).then(() => {
                    UnityAds.load({ adUnitId: adUnit });
                    onDone();
                }).catch(() => {
                    onDone(); // fallback if ad fails
                });
            }).catch(() => onDone());
            return;
        }

        // Web: use GameDistribution SDK if loaded
        if (typeof gdsdk !== "undefined" && typeof gdsdk.showBanner === "function") {
            window._gdAdResolve = onDone;
            gdsdk.showBanner();
            return;
        }

        // Final fallback: mock countdown modal
        const modal = document.getElementById("adInterstitial");
        if (!modal) {
            onDone();
            return;
        }
        const skipBtn = document.getElementById("adSkipBtn");
        const skipCount = document.getElementById("adSkipCount");
        const timerEl = document.getElementById("adTimer");
        let secs = 5;
        skipBtn.disabled = true;
        skipBtn.classList.remove("ready");
        skipBtn.textContent = "";
        const countSpan = document.createElement("span");
        countSpan.id = "adSkipCount";
        countSpan.textContent = String(secs);
        skipBtn.textContent = "Skip in ";
        skipBtn.appendChild(countSpan);
        const sUnit = document.createTextNode("s");
        skipBtn.appendChild(sUnit);
        if (timerEl) timerEl.textContent = String(secs);
        modal.classList.remove("hidden");

        const tick = setInterval(() => {
            secs -= 1;
            const sc = skipBtn.querySelector("span");
            if (sc) sc.textContent = String(secs);
            if (timerEl) timerEl.textContent = String(secs);
            if (secs <= 0) {
                clearInterval(tick);
                skipBtn.disabled = false;
                skipBtn.classList.add("ready");
                skipBtn.textContent = "Get Hint →";
                if (timerEl) timerEl.textContent = "Done";
            }
        }, 1000);

        skipBtn.onclick = () => {
            if (skipBtn.disabled) {
                return;
            }
            clearInterval(tick);
            modal.classList.add("hidden");
            onDone();
        };
    }

    function showHint() {
        showAdInterstitial(runHintLogic);
    }

    function runHintLogic() {
        const moves = getLegalMoves().sort((a, b) => scoreHintMove(b) - scoreHintMove(a));
        if (isFreeCellGame()) {
            if (!moves.length) {
                showMessage("No obvious FreeCell moves", 1300);
                clearHintHighlights();
                audio.error();
                return;
            }
            const move = moves[0];
            const sourcePile = getPileRef(move.source.type, move.source.index);
            const card = sourcePile?.[move.source.cardIndex];
            const cardName = card ? `${rankLabel(card.rank)}${SUIT_SYMBOL[card.suit]}` : "card";
            const from = describeLocation(move.source);
            const to = describeLocation(move.target);
            showMessage(`Hint: move ${cardName} from ${from} to ${to}`, 2200);
            highlightHintMove(move);
            audio.hint();
            return;
        }
        if (isSpiderGame()) {
            if (!moves.length) {
                if (state.stock.length) {
                    if (state.tableau.some((pile) => pile.length === 0)) {
                        showMessage("Hint: fill empty columns before dealing again", 1700);
                        audio.error();
                    } else {
                        showMessage("Hint: deal a new row from stock", 1300);
                        highlightStockHint();
                        audio.hint();
                    }
                } else {
                    showMessage("No obvious Spider moves", 1300);
                    clearHintHighlights();
                    audio.error();
                }
                return;
            }

            const move = moves[0];
            const sourcePile = getPileRef(move.source.type, move.source.index);
            const card = sourcePile?.[move.source.cardIndex];
            const cardName = card ? `${rankLabel(card.rank)}${SUIT_SYMBOL[card.suit]}` : "sequence";
            showMessage(`Hint: move ${cardName} from tableau ${move.source.index + 1} to tableau ${move.target.index + 1}`, 2200);
            highlightHintMove(move);
            audio.hint();
            return;
        }

        if (!moves.length || (state.stock.length > 0 && scoreHintMove(moves[0]) < 70)) {
            if (state.stock.length) {
                showMessage("Hint: draw from stock", 1300);
                highlightStockHint();
                audio.hint();
            } else {
                showMessage("No obvious moves", 1300);
                clearHintHighlights();
                audio.error();
            }
            return;
        }

        const move = moves[0];
        const sourcePile = getPileRef(move.source.type, move.source.index);
        const card = sourcePile?.[move.source.cardIndex];
        const cardName = card ? `${rankLabel(card.rank)}${SUIT_SYMBOL[card.suit]}` : "card";
        const from = describeLocation(move.source);
        const to = describeLocation(move.target);
        showMessage(`Hint: move ${cardName} from ${from} to ${to}`, 2200);
        highlightHintMove(move);
        audio.hint();
    }

    function canAutoFinish() {
        if (isSpiderGame() || isFreeCellGame()) {
            return false;
        }
        if (state.stock.length > 0 || state.waste.length > 0) {
            return false;
        }
        for (let col = 0; col < state.tableau.length; col += 1) {
            if (state.tableau[col].some((card) => !card.faceUp)) {
                return false;
            }
        }
        return true;
    }

    function runAutoFinish() {
        if (isSpiderGame() || isFreeCellGame()) {
            showMessage("Auto finish is only available for Klondike", 1500);
            audio.error();
            return;
        }
        if (state.autoFinishing) {
            return;
        }
        if (!canAutoFinish()) {
            showMessage("Auto finish is available when stock is empty and all cards are face-up", 1800);
            audio.error();
            return;
        }
        state.autoFinishing = true;
        showMessage("Auto finishing", 1000);
        const step = () => {
            if (!state.autoFinishing) {
                return;
            }
            let moved = false;
            for (let col = 0; col < 7; col += 1) {
                const pile = state.tableau[col];
                if (!pile.length) {
                    continue;
                }
                const idx = pile.length - 1;
                const source = { type: "tableau", index: col, cardIndex: idx };
                if (tryAutoMoveToFoundation(source)) {
                    moved = true;
                    break;
                }
            }

            if (state.foundations.every((pile) => pile.length === 13)) {
                state.autoFinishing = false;
                return;
            }
            if (!moved) {
                state.autoFinishing = false;
                showMessage("Auto finish complete", 1200);
                return;
            }
            setTimeout(step, state.reducedMotion ? 20 : 120);
        };
        step();
    }

    function toggleSound() {
        state.muted = !state.muted;
        el.soundOnIcon.classList.toggle("hidden", state.muted);
        el.soundOffIcon.classList.toggle("hidden", !state.muted);
        saveSettings();
        if (!state.muted) {
            audio.uiOpen();
        }
        showMessage(state.muted ? "Sound off" : "Sound on", 800);
    }

    function toggleSettingsPanel(forceOpen) {
        const wasOpen = state.settingsOpen;
        state.settingsOpen = typeof forceOpen === "boolean" ? forceOpen : !state.settingsOpen;
        el.settingsPanel.classList.toggle("open", state.settingsOpen);
        el.settingsPanel.setAttribute("aria-hidden", String(!state.settingsOpen));
        el.settingsBtn.classList.toggle("active", state.settingsOpen);
        if (state.settingsOpen && !wasOpen) {
            audio.uiOpen();
        } else if (!state.settingsOpen && wasOpen) {
            audio.uiClose();
        }
    }

    function bindTopControls() {
        el.homeBtn.addEventListener("click", () => {
            audio.uiOpen();
            showHomeScreen();
        });
        el.newGameBtn.addEventListener("click", () => {
            newGame();
        });
        el.undoBtn.addEventListener("click", undoMove);
        el.hintBtn.addEventListener("click", showHint);
        el.autoFinishBtn.addEventListener("click", runAutoFinish);
        el.soundBtn.addEventListener("click", toggleSound);
        el.settingsBtn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            toggleSettingsPanel();
        });

        el.volumeInput.addEventListener("input", () => {
            state.volume = Math.max(0, Math.min(1, Number(el.volumeInput.value) / 100));
            saveSettings();
        });
        el.effectsInput.addEventListener("change", () => {
            state.effectsEnabled = el.effectsInput.checked;
            audio.uiOpen();
            saveSettings();
        });
        el.reducedMotionInput.addEventListener("change", () => {
            state.reducedMotion = el.reducedMotionInput.checked;
            document.body.classList.toggle("reduced-motion", state.reducedMotion);
            audio.uiOpen();
            saveSettings();
        });
        el.autosaveInput.addEventListener("change", () => {
            state.autosave = el.autosaveInput.checked;
            audio.uiOpen();
            saveSettings();
            if (!state.autosave) {
                clearSavedGame();
            } else {
                saveGame();
            }
        });
        el.clearSaveBtn.addEventListener("click", () => {
            audio.uiClose();
            clearSavedGame();
        });

        document.addEventListener("click", (ev) => {
            if (state.settingsOpen && !el.settingsPanel.contains(ev.target) && ev.target !== el.settingsBtn) {
                toggleSettingsPanel(false);
            }
        });

        window.addEventListener("keydown", (ev) => {
            if (!el.homeScreen.classList.contains("hidden")) {
                if (ev.key === "Escape") {
                    el.setupPanel.classList.remove("open");
                    el.setupPanel.setAttribute("aria-hidden", "true");
                }
                return;
            }
            if (ev.key.toLowerCase() === "n") {
                newGame();
            }
            if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z") {
                ev.preventDefault();
                undoMove();
            }
            if (ev.key.toLowerCase() === "h") {
                showHint();
            }
            if (ev.key.toLowerCase() === "d") {
                drawFromStock();
            }
            if (ev.key.toLowerCase() === "m") {
                toggleSound();
            }
            if (ev.key.toLowerCase() === "a") {
                runAutoFinish();
            }
            if (ev.key === "Escape") {
                toggleSettingsPanel(false);
            }
        });

        window.addEventListener("beforeunload", () => {
            saveGame();
            saveSettings();
        });


    }

    function bindHomeScreenControls() {
        el.browseGamesBtn.addEventListener("click", () => {
            document.getElementById("solitaireSection")?.scrollIntoView({ behavior: state.reducedMotion ? "auto" : "smooth", block: "start" });
            audio.uiOpen();
        });

        el.continueSavedBtn.addEventListener("click", () => {
            const saveMeta = getSavedGameMeta();
            if (!saveMeta) {
                audio.error();
                return;
            }
            state.setupGame = saveMeta.currentGame;
            launchSelectedGame(true);
        });

        el.homeScreen.querySelectorAll(".game-card[data-game], .feature-play-btn[data-game]").forEach((card) => {
            card.addEventListener("click", (ev) => {
                ev.stopPropagation();
                openSetupForGame(card.dataset.game);
            });
        });

        el.closeSetupBtn.addEventListener("click", () => {
            el.setupPanel.classList.remove("open");
            el.setupPanel.setAttribute("aria-hidden", "true");
            audio.uiClose();
        });

        el.setupPanel.addEventListener("click", (ev) => {
            if (ev.target === el.setupPanel) {
                el.setupPanel.classList.remove("open");
                el.setupPanel.setAttribute("aria-hidden", "true");
                audio.uiClose();
            }
        });

        el.startGameBtn.addEventListener("click", () => {
            launchSelectedGame(false);
        });

        el.setupResumeBtn.addEventListener("click", () => {
            launchSelectedGame(true);
        });
    }

    loadSettings();
    updateSubtitle();
    bindTopControls();
    bindHomeScreenControls();
    showHomeScreen();
    registerServiceWorker();
    initUnityAds();
})();
