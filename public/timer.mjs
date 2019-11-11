let url = window.WS_URL

class Timer {
    constructor(limiter, display, bestlap, results) {
        this.limiter = limiter;
        this.display = display;
        this.bestlap = bestlap;
        this.results = results;
        this.clear();
    }

    start() {
        if (!this.time) {
            this.time = performance.now();
        }
        if (!this.running) {
            this.running = true;
            requestAnimationFrame(this.step.bind(this));
        }
    }

    pause() {
        this.time = null;
        this.running = false;
    }

    passed() {
        if (!this.time) {
            return;
        }
        if (this.times[0] > 0 || this.times[1] > 3) {
            this.record();
            this.restart();
        }
    }

    reset() {
        this.times = [0, 0, 0];
        this.print();
        this.pause();
    }

    clear() {
        if (this.time) {
            return;
        }
        this.latest = null;
        this.records = [];
        this.limit = [4, 0, 0];
        this.reset();
        this.bestlap.innerText = '';
        while (this.results.lastChild) {
            this.results.removeChild(this.results.lastChild);
        }
    }

    press() {
        var stamp = new Date().getTime();
        if (!this.pressed || (stamp - this.pressed) > 3000) {
            this.passed();
            this.pressed = new Date().getTime();
        }
    }

    restart() {
        this.reset();
        this.start();
    }

    step(timestamp) {
        if (!this.running) {
            return;
        }
        this.calculate(timestamp);
        this.time = timestamp;
        this.print();
        requestAnimationFrame(this.step.bind(this));
    }

    calculate(timestamp) {
        var diff = timestamp - this.time;

        // limit
        this.limit[2] -= diff;
        if (this.limit[2] < 0) {
            this.limit[2] += 1000;
            this.limit[1] -= 1;
        }
        if (this.limit[1] < 0) {
            this.limit[1] += 60;
            this.limit[0] -= 1;
        }
        if (this.limit[0] < 0) {
            this.limit[2] = 0
            this.limit[1] = 0
            this.limit[0] = 0
            this.pause();
            return;
        }

        // times
        this.times[2] += diff;
        if (this.times[2] >= 1000) {
            this.times[2] -= 1000;
            this.times[1] += 1;
        }
        if (this.times[1] >= 60) {
            this.times[1] -= 60;
            this.times[0] += 1;
        }
        if (this.times[0] >= 60) {
            this.times[0] -= 60
        }
        if (this.times[2] < 0) {
            this.times[2] = 0;
        }
    }

    print() {
        this.limiter.innerText = this.format(this.limit);
        this.display.innerText = this.format(this.times);

        if (this.limit[0] <= 0 && this.limit[1] <= 30) {
            this.limiter.classList.add("limiter_red");
            this.limiter.classList.remove("limiter_yellow");
            this.limiter.classList.remove("limiter_normal");
        } else if (this.limit[0] <= 0 && this.limit[1] <= 60) {
            this.limiter.classList.add("limiter_yellow");
            this.limiter.classList.remove("limiter_normal");
            this.limiter.classList.remove("limiter_red");
        } else {
            this.limiter.classList.add("limiter_normal");
            this.limiter.classList.remove("limiter_yellow");
            this.limiter.classList.remove("limiter_red");
        }
    }

    record() {
        let li = document.createElement('li');
        li.innerText = this.format(this.times);
        this.results.appendChild(li);

        console.log(this.format(this.times));

        this.latest = this.times;
        this.records.push(this.times);
        this.records.sort(compare);
        this.bestlap.innerText = this.format(this.records[0]);
    }

    remove() {
        if (this.records.length == 0) {
            return;
        }

        console.log(this.format(this.records[0]));

        this.latest = null;
        this.records.splice(0, 1);
        if (this.records.length == 0) {
            this.bestlap.innerText = "";
        } else {
            this.bestlap.innerText = this.format(this.records[0]);
        }
    }

    squeeze() {
        if (!this.latest) {
            return;
        }

        console.log(this.format(this.latest));

        this.times[2] += this.latest[2];
        this.times[1] += this.latest[1];
        this.times[0] += this.latest[0];
        if (this.times[2] >= 1000) {
            this.times[2] -= 1000;
            this.times[1] += 1;
        }
        if (this.times[1] >= 60) {
            this.times[1] -= 60;
            this.times[0] += 1;
        }
        if (this.times[0] >= 60) {
            this.times[0] -= 60
        }
        if (this.times[2] < 0) {
            this.times[2] = 0;
        }

        this.latest = null;
        this.results.removeChild(this.results.lastChild);
    }

    format(times) {
        return `${lpad(times[0], 2)}:${lpad(times[1], 2)}.${lpad(Math.floor(times[2]), 3)}`;
    }
}

function compare(a, b) {
    if (a[0] < b[0]) {
        return -1;
    } else if (a[0] > b[0]) {
        return 1;
    }
    if (a[1] < b[1]) {
        return -1;
    } else if (a[1] > b[1]) {
        return 1;
    }
    if (a[2] < b[2]) {
        return -1;
    } else if (a[2] > b[2]) {
        return 1;
    }
    return 0;
}

function lpad(value, count) {
    var result = '000' + value.toString();
    return result.substr(result.length - count);
}

let timer = new Timer(
    document.querySelector('.limiter'),
    document.querySelector('.display'),
    document.querySelector('.bestlap'),
    document.querySelector('.results')
);

// setup the web socket
let ws = new WebSocket(url);
ws.onopen = open;
ws.onclose = close;
ws.onmessage = message;
ws.onerror = console.log;

function open() {
    console.log('ws open');
}

function close() {
    console.log('ws close');
}

function message(e) {
    let msg = JSON.parse(e.data);

    console.log(`ws message : ${msg.text}`);

    exec(msg.text);
}

function send(name) {
    var msg = {
        type: 'message',
        text: name
    };
    ws.send(JSON.stringify(msg));
}

function exec(name) {
    switch (name) {
        case 'start':
            timer.start();
            break;
        case 'pause':
            timer.pause();
            break;
        case 'passed':
            timer.passed();
            break;
        case 'press':
            timer.press();
            break;
        case 'reset':
            timer.reset();
            break;
        case 'clear':
            timer.clear();
            break;
        case 'remove':
            timer.remove();
            break;
        case 'squeeze':
            timer.squeeze();
            break;
    }
}

let key_map = {
    '81': 'start',
    '87': 'pause',
    '69': 'passed',
    '82': 'reset',
    '84': 'clear',
    '89': 'remove',
    '71': 'squeeze',
};

document.addEventListener('keydown', function (event) {
    console.log(`keydown ${event.keyCode} : ${key_map[event.keyCode]}`);

    send(key_map[event.keyCode]);
});

function btn_listener(event) {
    let name = event.target.id.substring(4);

    exec(name);
}

document.getElementById('btn_start').addEventListener('click', btn_listener);
document.getElementById('btn_pause').addEventListener('click', btn_listener);
document.getElementById('btn_passed').addEventListener('click', btn_listener);
document.getElementById('btn_reset').addEventListener('click', btn_listener);
document.getElementById('btn_clear').addEventListener('click', btn_listener);