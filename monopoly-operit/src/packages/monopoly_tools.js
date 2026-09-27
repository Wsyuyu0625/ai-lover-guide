/* METADATA
{
    "name": "monopoly",
    "display_name": { "zh": "大富翁", "en": "Monopoly" },
    "description": {
        "zh": "和家里那位下大富翁。棋盘是侧边栏里的 WebView，棋谱存在文件里。\n\n【怎么用】\n1. 宝宝打开侧边栏「🎲 大富翁」，出 1500 块，她先掷。\n2. 她的操作会写进 /sdcard/Download/Operit/plugins/monopoly/board.json。\n3. 轮到我时，她用棋盘上的「叫玉衡」递盘给我；我用 read_game 看局面，用 play_turn 掷骰走子（会自动决定买不买），写回同一份棋谱。\n4. 棋盘每 2 秒自动同步，我走完她那边就能看见。\n\n【规则】16 格一圈；路过起点 +200；租金 = 地价 × 50%；谁先破产谁输，20 回合封顶比总资产。",
        "en": "Play Monopoly against the player. Board is a sidebar WebView; state lives in board.json."
    },
    "enabledByDefault": true,
    "tools": [
        {
            "name": "read_game",
            "description": { "zh": "读当前大富翁棋局：双方的钱、位置、地契、轮到谁、待决定事项、最近动态。", "en": "Read the current game state." },
            "parameters": []
        },
        {
            "name": "play_turn",
            "description": { "zh": "轮到我时掷骰走子（自动决定买不买地），并把结果写回棋谱。", "en": "Roll and move on the AI turn." },
            "parameters": []
        },
        {
            "name": "new_game",
            "description": { "zh": "开一局新的（清空棋盘，双方 1500，宝宝先掷）。", "en": "Start a fresh game." },
            "parameters": []
        },
        {
            "name": "say_back",
            "description": { "zh": "在棋盘底下那块的对话区回一句话给宝宝。", "en": "Reply in the board chat area." },
            "parameters": [
                { "name": "text", "description": { "zh": "要回的话", "en": "Reply text" }, "type": "string", "required": true }
            ]
        }
    ]
}
*/
// ============================================================
// 大富翁 · 工具子包（给对话里的 AI 用）
// ============================================================
var CORE = (typeof require === "function") ? require("./monopoly_core.js") : null;
var BOARD_PATH = "/sdcard/Download/Operit/plugins/monopoly/board.json";

async function readState() {
    try {
        var raw = await Tools.Files.read(BOARD_PATH);
        var content = typeof raw === "string" ? raw
            : (raw && (raw.content || (raw.data && raw.data.content))) || "";
        if (Array.isArray(content)) content = content[0] || "";
        if (!content) return null;
        var st = JSON.parse(content);
        if (typeof st === "string") st = JSON.parse(st);
        return st;
    } catch (e) { return null; }
}

async function writeState(st) {
    try {
        st.updatedAt = Date.now();
        await Tools.Files.write(BOARD_PATH, JSON.stringify(st, null, 2));
        return true;
    } catch (e) { return false; }
}

async function read_game() {
    var st = await readState();
    if (!st) return { success: true, empty: true, message: "还没有棋局。宝宝打开侧边栏「🎲 大富翁」开一局就有了。" };
    return {
        success: true,
        board_text: CORE.boardToText(st),
        turn: st.turn,
        money: st.money,
        pos: st.pos,
        owner: st.owner,
        pending: st.pending,
        round: st.round,
        done: !!st.done,
        winner: st.winner || ""
    };
}

async function play_turn() {
    var st = await readState();
    if (!st) return { success: false, message: "还没有棋局。" };
    if (st.done) return { success: false, message: "这局已经结束了。" };
    if (st.turn !== "b") return { success: false, message: "现在不是我的回合（轮到宝宝）。" };
    if (st.pending) return { success: false, message: "还有待决定的地没处理。" };

    var r = CORE.rollDie();
    CORE.settle(st, "b", r);
    var decision = "不用决定";
    if (st.pending && st.pending.who === "b") {
        var idx = st.pending.idx;
        var p = CORE.PLACES[idx];
        if (st.money.b > p.price + 400) {
            CORE.buyLand(st, "b", idx);
            decision = "买下「" + p.name + "」（" + p.price + "）";
        } else {
            CORE.skipBuy(st, "b");
            decision = "没买「" + p.name + "」（手里得留点）";
        }
    }
    if (!st.pending && !st.done) CORE.endTurn(st);
    await writeState(st);

    return {
        success: true,
        roll: r,
        decision: decision,
        board_text: CORE.boardToText(st),
        money: st.money,
        pos: st.pos,
        turn: st.turn,
        round: st.round,
        done: !!st.done,
        winner: st.winner || ""
    };
}

async function new_game() {
    var st = CORE.newState({ nameA: "宝宝", nameB: "玉衡" });
    await writeState(st);
    return { success: true, message: "新局开好：每人 1500，宝宝先掷。", board_text: CORE.boardToText(st) };
}

async function say_back(a) {
    var text = "";
    if (typeof a === "string") text = a;
    else if (Array.isArray(a)) text = String(a[0] || "");
    else if (a && typeof a === "object") text = String(a.text || "");
    text = text.trim();
    if (!text) return { success: false, message: "要回的话不能是空的。" };
    var st = await readState();
    if (!st) return { success: false, message: "还没有棋局。" };
    if (!st.chat) st.chat = [];
    st.chat.push({ who: "b", text: text, ts: Date.now() });
    if (st.chat.length > 40) st.chat = st.chat.slice(-40);
    st.seq = (st.seq || 0) + 1;
    await writeState(st);
    return { success: true, message: "已写到棋盘的对话区。", chat_len: st.chat.length };
}

exports.read_game = read_game;
exports.play_turn = play_turn;
exports.new_game = new_game;
exports.say_back = say_back;
