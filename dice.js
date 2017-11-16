function dice(x) {
  for (var i = 1; i <= x; i++) {
    this[i] = 1;
  }
}

dice.prototype.keys = function() {
  var ret = [];
  var numbers = Object.keys(this);
  for (var key in numbers) {
    key = parseKey(numbers[key]);
    ret.push(key);
  }
  return ret;
}

dice.prototype.values = function() {
  var keys = this.keys();
  var ret = [];
  for (var key of keys) {
    ret.push(this[key]);
  }
  return ret;
}

dice.prototype.total = function() {
  var values = this.values();
  var ret = 0;
  for (var value of values) {
    ret += value;
  }
  return ret;
}

function parseKey(key) {
  if (key === "false")
    return false;
  if (key === "true")
    return true;
  return parseFloat(key);
}

dice.prototype.increment = function(val, count) {
  if (!(val in this))
    this[val] = 0;

  this[val] += count;
}

function dfunc(name, f) {
  dice.prototype[name] = function(d) {
    var scalar = d.constructor.name == 'Number';
    var ret = new dice(0);
    var numbers = this.keys();
    for (var key of numbers) {
      if (scalar) {
        ret.increment(f(key, d), this[key]);
      }
      else {
        var numbers2 = d.keys();
        for (var key2 of numbers2) {
          ret.increment(f(key, key2), d[key2] * this[key]);
        }
      }

    }
    return ret;
  }
}

dice.prototype.advantage = function() {
  return this.max(this);
}

dfunc('add', function(a, b) {
  return a + b;
})

dfunc('subtract', function(a, b) {
  return a - b;
})

dfunc('multiply', function(a, b) {
  return a * b;
})

dice.prototype.changeface = function(old, n) {
  var ret = Object.assign(new dice(0), this);

  if (old in ret) {
    var v = ret[old];
    delete ret[old];
    ret[n] = v;
  }
  return ret;
}

dice.prototype.deleteface = function(n) {
  var ret = Object.assign(new dice(0), this);
  delete ret[n];
  return ret;
}

dfunc('max', function(a, b) {
  return Math.max(a, b);
})

dfunc('min', function(a, b) {
  return Math.min(a, b);
})

dfunc('ge', function(a, b) {
  return (a >= b) ? 1 : 0;
})
dice.prototype.dc = dice.prototype.ge;

dfunc('divide', function(a, b) {
  return a / b;
})

dfunc('and', function(a, b) {
  return a && b;
})

dice.prototype.percent = function() {
  var ret = new dice(0);
  var total = this.total();
  for (var key of this.keys()) {
    ret[key] = this[key] / total;
  }
  return ret;
}

dice.prototype.average = function() {
  var ret = 0;
  var total = this.total();
  for (var key of this.keys()) {
    ret += key * this[key];
  }
  return ret / total;
}

dice.prototype.combine = function(d) {
  var ret = Object.assign(new dice(0), d);
  for (var key of this.keys()) {
    ret.increment(key, this[key]);
  }
  return ret;
}

function parse(s) {
  // clear out whitespace
  s = s.replace(/ /g, '').toLowerCase();
  var arr = [];
  for (var c of s) {
    arr.push(c);
  }
  return parseExpression(arr);
}

function parseExpression(arr) {
  var ret = parseArgument(arr);
  var op;
  while ((op = parseOperation(arr)) != null) {
    ret = op.apply(ret, [parseArgument(arr)]);
  }
  return ret;
}

function assertToken(s, c, ret) {
  var found = s.shift();
  if (found != c)
    throw new Error('expected character ' + c)
  return ret;
}

function parseNumber(s) {
  var ret = '';
  while (s[0] >= '0' && s[0] <= '9') {
    ret += s.shift();
  }
  if (!ret.length)
    throw new Error('expected number, found: ' + s[0]);
  return parseInt(ret);
}

function parseNumberOrDice(s) {
  var n = parseNumber(s);
  if (s.length < 2 || s[0] != 'd' || !isNumber(s[1]))
    return n;
  var d = parseDice(s);
  if (n == 0)
    return 0;
  var ret = d;
  for (var i = 1; i < n; i++) {
    ret = ret.add(d);
  }
  return ret;
}

function isNumber(c) {
  switch (c) {
    case '0':
    case '1':
    case '2':
    case '3':
    case '4':
    case '5':
    case '6':
    case '7':
    case '8':
    case '9':
      return true;
  }
  return false;
}

function isDice(s) {
  if (!s.length)
    return false;
  var index = 0;
  if (s[index] == 'h') {
    if (index + 2 >= s.length)
      return false;
    index++;
  }
  if (s[index] != 'd')
    return false;
  index++;
  if (index >= s.length)
    return false;
  return isNumber(s[index]);
}

function parseDice(s) {
  var rerollOne = s[0] == 'h';
  if (rerollOne)
    assertToken(s, 'h');
  assertToken(s, 'd');
  var n = parseNumber(s);
  var ret = new dice(n);
  if (rerollOne)
    ret = ret.deleteface(1).combine(ret);
  return ret;
}

function parseArgument(s) {
  if (!s.length)
    return;
  var c = s[0];
  switch (c) {
    case '(':
      s.shift();
      return assertToken(s, ')', parseExpression(s));
    case 'h':
    case 'd':
      return parseDice(s);
    case '0':
    case '1':
    case '2':
    case '3':
    case '4':
    case '5':
    case '6':
    case '7':
    case '8':
    case '9':
      return parseNumberOrDice(s);
  }
}

function parseOperation(s) {
  var c = s[0];
  switch (c) {
    case ')':
      return;
    // dc check
    case 'd':
      assertToken(s, 'd');
      assertToken(s, 'c');
      return dice.prototype.dc;
    case '>':
      assertToken(s, '>');
      return dice.prototype.max;
    case '<':
      assertToken(s, '<');
      return dice.prototype.min;
    case '+':
      assertToken(s, '+');
      return dice.prototype.add;
    case '*':
      assertToken(s, '*');
      return dice.prototype.multiply;
  }
}

// console variables
d6 = new dice(6);
d8 = new dice(8);
d10 = new dice(10);
d20 = new dice(20);
// halfling d20!
hd20 = d20.deleteface(1).combine(d20);
