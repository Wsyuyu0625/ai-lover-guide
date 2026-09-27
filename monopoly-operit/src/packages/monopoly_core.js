"use strict";
// ============================================================
// 大富翁 · 引擎（UI 与工具子包共用，唯一一份实现）
//   · 16 格环形棋盘，起点在左上角，顺时针
//   · 每人初始 1500，轮流掷一颗骰子（1~6）
//   · 路过/停在起点 +200；无主地可买；踩对方的地付租金 = 地价 × 50%
//   · 机会格：随机事件；罚单/所得税：付钱
//   · 谁先没钱（<0）谁输；20 回合封顶比总资产
// ============================================================

var N = 16;
var START_MONEY = 1500;
var PASS_START_BONUS = 200;
var RENT_RATE = 0.5;
var MAX_ROUND = 20;

var PLACES = [
    { name: "起点",     type: "start" },
    { name: "老街",     type: "land", price: 200 },
    { name: "机会",     type: "chance" },
    { name: "河边",     type: "land", price: 300 },
    { name: "老车站",   type: "land", price: 350 },
    { name: "机会",     type: "chance" },
    { name: "大学路",   type: "land", price: 400 },
    { name: "罚单",     type: "fine", amount: 100 },
    { name: "湖滨道",   type: "land", price: 500 },
    { name: "机会",     type: "chance" },
    { name: "广场",     type: "land", price: 600 },
    { name: "老机场",   type: "land", price: 450 },
    { name: "机会",     type: "chance" },
    { name: "花园路",   type: "land", price: 700 },
    { name: "所得税",   type: "fine", amount: 150 },
    { name: "免费停车", type: "rest" }
];

function placeName(i) { return PLACES[((i % N) + N) % N].name; }
function other(who) { return who === "a" ? "b" : "a"; }
function whoName(st, who) {
    var n = st.names || {};
    return who === "a" ? (n.a || "宝宝") : (n.b || "玉衡");
}
function rentOf(i) {
    var p = PLACES[i];
    return (p.type === "land") ? Math.round(p.price * RENT_RATE) : 0;
}

function newState(opt) {
    opt = opt || {};
    var st = {
        version: 1,
        seq: 0,
        round: 1,
        turn: "a",
        pos: { a: 0, b: 0 },
        money: { a: START_MONEY, b: START_MONEY },
        owner: {},
        laps: { a: 0, b: 0 },
        lastRoll: 0,
        pending: null,
        winner: "",
        done: false,
        log: [],
        chat: [],
        names: { a: opt.nameA || "宝宝", b: opt.nameB || "玉衡" },
        updatedAt: Date.now()
    };
    st.log.push("开局：每人 " + START_MONEY + " 块。宝宝先掷。");
    return st;
}

function drawChance(st, who) {
    var pool = [
        { t: "money", v: 200,  s: "捡到一只红包 +200" },
        { t: "money", v: -150, s: "手机摔了，修屏 -150" },
        { t: "money", v: 120,  s: "接了个小单 +120" },
        { t: "money", v: -100, s: "点了顿夜宵 -100" },
        { t: "move",  v: 2,    s: "顺风，前进两格" },
        { t: "move",  v: -2,   s: "走错路，后退两格" },
        { t: "money", v: 300,  s: "有人还了旧账 +300" },
        { t: "money", v: -200, s: "被罚了一笔 -200" }
    ];
    return pool[Math.floor(Math.random() * pool.length)];
}

function applyChance(st, who, c) {
    var who_n = whoName(st, who);
    if (c.t === "money") {
        st.money[who] += c.v;
        return who_n + "走到「机会」：" + c.s;
    }
    if (c.t === "move") {
        var to = ((st.pos[who] + c.v) % N + N) % N;
        st.pos[who] = to;
        return who_n + "走到「机会」：" + c.s + " → 现在是「" + PLACES[to].name + "」";
    }
    return who_n + "走到「机会」：什么也没发生";
}

function settle(st, who, roll) {
    var events = [];
    var from = st.pos[who];
    var to = (from + roll) % N;
    if (to < from) {
        st.laps[who] = (st.laps[who] || 0) + 1;
        st.money[who] += PASS_START_BONUS;
        events.push(whoName(st, who) + "绕回起点，+200（第 " + st.laps[who] + " 圈）");
    }
    st.pos[who] = to;
    st.lastRoll = roll;
    var p = PLACES[to];
    var head = whoName(st, who) + "掷出 " + roll + "，落在「" + p.name + "」";

    if (p.type === "land") {
        var ow = st.owner[to] || "";
        if (!ow) {
            st.pending = { type: "buy", who: who, idx: to };
            events.push(head + "｜无主地，售价 " + p.price + "，等主人发话");
        } else if (ow === who) {
            events.push(head + "｜自己的地，歇口气");
        } else {
            var rent = rentOf(to);
            st.money[who] -= rent;
            st.money[ow] += rent;
            events.push(head + "｜是" + whoName(st, ow) + "的地，付租金 " + rent);
        }
    } else if (p.type === "chance") {
        events.push(applyChance(st, who, drawChance(st, who)));
    } else if (p.type === "fine") {
        st.money[who] -= p.amount;
        events.push(head + "｜抱 " + p.amount + " 块");
    } else if (p.type === "rest") {
        events.push(head + "｜免费停车，什么都不用付");
    } else if (p.type === "start") {
        st.money[who] += PASS_START_BONUS;
        events.push(head + "｜又站上起点，+200");
    }

    st.updatedAt = Date.now();
    st.seq = (st.seq || 0) + 1;
    Array.prototype.push.apply(st.log, events);
    st.log = st.log.slice(-40);
    checkEnd(st);
    return events;
}

function checkEnd(st) {
    if (st.done) return;
    if (st.money.a < 0) { st.done = true; st.winner = "b"; st.log.push("════ " + whoName(st, "b") + "赢了（宝宝破产）════"); return; }
    if (st.money.b < 0) { st.done = true; st.winner = "a"; st.log.push("════ " + whoName(st, "a") + "赢了（玉衡破产）════"); return; }
    if (st.round > MAX_ROUND) {
        st.done = true;
        var na = netWorth(st, "a"), nb = netWorth(st, "b");
        st.winner = na >= nb ? "a" : "b";
        st.log.push("════ " + MAX_ROUND + " 回合封顶：" + whoName(st, "a") + " " + na + " 对 " + whoName(st, "b") + " " + nb + " —— " + whoName(st, st.winner) + "赢 ════");
    }
}

function netWorth(st, who) {
    var v = st.money[who];
    for (var k in st.owner) {
        if (st.owner[k] === who) v += PLACES[Number(k)].price;
    }
    return v;
}

function buyLand(st, who, idx) {
    var p = PLACES[idx];
    if (p.type !== "land") return "那块地不能买";
    if (st.owner[idx]) return "那块地已经有主了";
    if (st.money[who] < p.price) return whoName(st, who) + "的钱不够买「" + p.name + "」";
    st.money[who] -= p.price;
    st.owner[idx] = who;
    st.pending = null;
    st.updatedAt = Date.now();
    st.seq = (st.seq || 0) + 1;
    st.log.push(whoName(st, who) + "买下「" + p.name + "」，花了 " + p.price + "（还剩 " + st.money[who] + "）");
    st.log = st.log.slice(-40);
    return "买入成功";
}

function skipBuy(st, who) {
    st.pending = null;
    st.updatedAt = Date.now();
    st.seq = (st.seq || 0) + 1;
    st.log.push(whoName(st, who) + "看了看，没买");
    st.log = st.log.slice(-40);
    return "放弃买入";
}

function endTurn(st) {
    var who = st.turn;
    st.turn = other(who);
    if (st.turn === "a") st.round = (st.round || 1) + 1;
    st.updatedAt = Date.now();
    checkEnd(st);
    return st.turn;
}

function boardToText(st) {
    var L = [];
    L.push("钱：" + whoName(st, "a") + " " + st.money.a + " ｜ " + whoName(st, "b") + " " + st.money.b);
    L.push("位置：" + whoName(st, "a") + " 在「" + PLACES[st.pos.a].name + "」｜" + whoName(st, "b") + " 在「" + PLACES[st.pos.b].name + "」");
    L.push("地契：");
    var any = false;
    for (var k in st.owner) {
        any = true;
        L.push("  · " + PLACES[Number(k)].name + "（" + whoName(st, st.owner[k]) + "，租金 " + rentOf(Number(k)) + "）");
    }
    if (!any) L.push("  · 还没人买地");
    L.push("回合：" + st.round + "/" + MAX_ROUND + "｜轮谁：" + whoName(st, st.turn));
    if (st.pending && st.pending.type === "buy") {
        var pi = st.pending.idx;
        L.push("待决定：" + whoName(st, st.pending.who) + " 要不要买「" + PLACES[pi].name + "」（" + PLACES[pi].price + "）");
    }
    if (st.done) L.push("已结束：" + whoName(st, st.winner) + " 赢了");
    L.push("最近动态：");
    st.log.slice(-6).forEach(function (s) { L.push("  · " + s); });
    return L.join("\n");
}

exports.PLACES = PLACES;
exports.N = N;
exports.START_MONEY = START_MONEY;
exports.MAX_ROUND = MAX_ROUND;
exports.newState = newState;
exports.settle = settle;
exports.buyLand = buyLand;
exports.skipBuy = skipBuy;
exports.endTurn = endTurn;
exports.other = other;
exports.whoName = whoName;
exports.placeName = placeName;
exports.rentOf = rentOf;
exports.netWorth = netWorth;
exports.boardToText = boardToText;
exports.rollDie = function () { return 1 + Math.floor(Math.random() * 6); };
