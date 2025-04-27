function dice(x) {
  for (var i = 1; i <= x; i++) {
    this[i] = 1;
  }

  if (x == 0)
    this[0] = 1;

  Object.defineProperty(this, "private", {
      enumerable: false,
      writable: true
  });

  this.private = {};
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

dice.prototype.maxFace = function() {
  return Math.max.apply(null, this.keys());
}

dice.prototype.minFace = function() {
  return Math.min.apply(null, this.keys());
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
  var ret = parseFloat(key);
  if (isNaN(ret))
    return key;
  return ret;
}

dice.prototype.increment = function(val, count) {
  if (!(val in this))
    this[val] = 0;

  this[val] += count;
}

dice.prototype.normalize = function(scalar) {
  var ret = Object.assign(new dice(), this);
  for (var key of ret.keys()) {
    ret[key] *= scalar;
  }
  return ret;
}

function dfunc(name, f, diceConstructor) {
  dice.prototype[name] = function(d) {
    var scalar = d.constructor.name == 'Number';
    var ret = diceConstructor ? diceConstructor() : new dice();
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

dfunc('addNonZero', function(a, b) {
  if (a != 0)
    return a + b;
  return a;
})

dfunc('subtract', function(a, b) {
  return a - b;
})

dfunc('multiply', function(a, b) {
  return (a == 0 ? 0 : 1) * b;
})

dice.prototype.changeFace = function(old, n) {
  var ret = Object.assign(new dice(), this);

  if (old in ret) {
    var v = ret[old];
    delete ret[old];
    ret[n] = v;
  }
  return ret;
}

dice.prototype.deleteFace = function(n) {
  var ret = Object.assign(new dice(), this);
  delete ret[n];
  return ret;
}

dice.prototype.reroll = function(d) {
  if (d.constructor.name == 'Number')
    d = scalarDice(d);

  var removed = Object.assign(new dice(), this);

  var numbers = d.keys();
  for (var face of numbers) {
    removed = removed.deleteFace(face);
  }

  var faces = this.keys().length;
  var ret = new dice();
  for (var face of this.keys()) {
    if (!removed[face]) {
      ret = ret.combine(removed);
      ret = ret.combine(this);
    }
    else {
      ret = ret.combine(removed);
    }
  }

  return ret;
}

dfunc('eq', function(a, b) {
  return a == b ? 1 : 0;
})

dfunc('max', function(a, b) {
  return Math.max(a, b);
})

dfunc('advantage', function(a, b) {
  return Math.max(a, b);
})
dice.prototype.advantage.unary = true;

dfunc('min', function(a, b) {
  return Math.min(a, b);
})

dfunc('ge', function(a, b) {
  return (a >= b) ? 0 : 1;
})


dfunc('dc', function(a, b) {
  return (a >= b) ? 0 : 1;
}, function() {
  var ret = new dice();
  ret[0] = 0;
  ret[1] = 0;
  return ret;
})

dfunc('ac', function(a, b) {
  return (a >= b) ? a : 0;
}, function() {
  var ret = new dice();
  ret[0] = 0;
  ret[1] = 0;
  return ret;
});

dfunc('divideRoundUp', function(a, b) {
  return Math.ceil(a / b);
})

dfunc('divide', function(a, b) {
  return a / b;
})

dfunc('divideRoundDown', function(a, b) {
  return Math.floor(a / b);
})

dfunc('and', function(a, b) {
  return a && b;
})

dice.prototype.percent = function() {
  var ret = new dice();
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
  var ret = Object.assign(new dice(), d);
  var except = Object.assign(new dice(), d);
  for (var key of this.keys()) {
    ret.increment(key, this[key]);
    delete except[key];
  }
  ret.private.except = d;
  return ret;
}

function parse(s, n) {
  // clear out whitespace
  s = s.replace(/ /g, '').toLowerCase();
  var arr = [];
  for (var c of s) {
    arr.push(c);
  }
  var ret = parseExpression(arr, n);
  if (arr.length)
    throw new Error('unexpected ' + arr[0]);
  return ret;
}

function parseBinaryArgument(arg, arr, n) {
  var half = arr.length && arr[0] == 'h';
  if (!half)
    return parseArgument(arr, n);

  assertToken(arr, 'h');
  assertToken(arr, 'a');
  assertToken(arr, 'l');
  assertToken(arr, 'f');
  return arg.divideRoundDown(2);
}

function parseExpression(arr, n) {
  var ret = parseArgument(arr, n);
  if (ret.constructor.name == 'Number')
    ret = new scalarDice(ret);

  var op;
  while ((op = parseOperation(arr)) != null) {
    var arg;
    if (!op.unary)
      arg = parseArgument(arr, n);
    else
      arg = ret;
    // crit
    var xcrit = arr.length && arr[0] == 'x';
    var crit;
    if (xcrit) {
      assertToken(arr, 'x');
      crit = true;
    }
    else {
      crit = arr.length && arr[0] == 'c';
    }
    if (crit) {
      assertToken(arr, 'c');
      assertToken(arr, 'r');
      assertToken(arr, 'i');
      assertToken(arr, 't');
      if (xcrit) {
        xcrit = parseNumber(arr);
        console.log(xcrit);
      }
      else {
        xcrit = 1;
      }
      crit = new dice();
      for (var i = 0; i < xcrit; i++) {
        var max = ret.maxFace();
        crit[max] = ret[max];
        ret = ret.deleteFace(max);
      }
      var critNormalize = crit.total();
      crit = op.apply(crit, [parseBinaryArgument(arg, arr, n)]);
      critNormalize = critNormalize ? crit.total() / critNormalize : 1;
    }

    var save = arr.length && arr[0] == 's';
    if (save) {
      assertToken(arr, 's');
      assertToken(arr, 'a');
      assertToken(arr, 'v');
      assertToken(arr, 'e');
      save = new dice();
      var min = ret.minFace();
      // make the face non zero for * operation
      save[min > 0 ? min : 1] = ret[min];
      var saveNormalize = save.total();
      ret = ret.deleteFace(min);
      save = op.apply(save, [parseBinaryArgument(arg, arr, n)]);
      saveNormalize = saveNormalize ? save.total() / saveNormalize : 1;
    }

    var normalize = ret.total();
    ret = op.apply(ret, [arg]);
    normalize = normalize ? ret.total() / normalize : 1;
    if (crit) {
      crit = crit.normalize(normalize);
      ret = ret.normalize(critNormalize);
      ret = ret.combine(crit);
      normalize *= critNormalize;
    }

    if (save) {
      save = save.normalize(normalize);
      ret = ret.normalize(saveNormalize);
      ret = ret.combine(save);
      normalize *= saveNormalize;
    }
  }
  return ret;
}

function assertToken(s, c, ret) {
  for (var ch of c) {
    var found = s.shift();
    if (found != ch)
      throw new Error('expected character ' + c)
  }
  return ret;
}

function parseNumber(s, n) {
  var ret = '';
  while ((s[0] >= '0' && s[0] <= '9') || s[0] == 'n') {
    if (s[0] != 'n') {
      ret += s.shift();
    }
    else {
      s.shift();
      ret += n;
    }
  }
  if (!ret.length)
    throw new Error('expected number, found: ' + s[0]);
  return parseInt(ret);
}

function opDiceInternal(d, ret, i, collect, freq, f) {
  if (i == d.length) {
    return ret.combine(scalarDice(f(collect)).normalize(freq));
  }

  var self = d[i];
  var numbers = self.keys();
  for (var key of numbers) {
    collect.push(key);
    ret = opDiceInternal(d, ret, i + 1, collect, freq * self[key], f);
    collect.pop();
  }

  return ret;
}

function opDice(d, f) {
  return opDiceInternal(d, new dice(), 0, [], 1, f);
}

function keepN(n, low) {
  return function(collect) {
    collect = collect.slice();
    collect.sort(function(a, b) {
      return low ? a - b : b - a;
    });

    collect = collect.slice(0, n);
    return collect.reduce((acc, cur) => acc + cur, 0);
  }
}

function multiplyDice(n, d) {
  if (n == 0)
    return new dice(0);

  if (n == 1)
    return d;

  var h = Math.floor(n / 2);
  var ret = multiplyDice(h, d);
  ret = ret.add(ret);
  if (n % 2 == 1)
    ret = ret.add(d);
    delete ret
  return ret;
}

function scalarDice(n) {
  var ret = new dice();
  ret[n] = 1;
  return ret;
}

function multiplyDiceByDice(dice1, dice2) {
  if (dice1.constructor.name == 'Number')
    dice1 = scalarDice(dice1);
  if (dice2.constructor.name == 'Number')
    dice2 = scalarDice(dice2);


  var ret = new dice();
  var faces = {};
  var numbers = dice1.keys();
  var faceNormalize = 1;
  for (var key of numbers) {
    var face;
    if (dice2.private.keep) {
      var repeat = [];
      for (var i = 0; i < key; i++) {
        repeat.push(dice2);
      }
      face = opDice(repeat, dice2.private.keep);
    }
    else {
      face = multiplyDice(key, dice2);
    }
    faceNormalize *= face.total();
    faces[key] = face;
  }

  for (var key in faces) {
    var face = faces[key];
    ret = ret.combine(face.normalize(dice1[key] * faceNormalize / face.total()))
  }

  ret.private.except = {};
  return ret;
}

function parseNumberOrDice(s, n) {
  var number = parseNumber(s, n);
  var d = parseArgument(s, n);
  if (!d)
    return number;
  if (number == 0)
    return 0;
  return multiplyDice(number, d);
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
    case 'n':
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

function peek(arr, expected) {
  if (expected.length > arr.length)
    return false;
  for (var i = 0; i < expected.length; i++) {
    if (arr[i] != expected.charAt(i))
      return false;
  }
  return true;
}

function peekIsNumber(arr, index) {
  if (index >= arr.length)
    return false;
  return isNumber(arr[index]);
}

function parseDice(s, n) {
  var rerollOne;
  if (peek(s, 'hd') && peekIsNumber(s, 2)) {
    assertToken(s, 'h');
    assertToken(s, 'd');
    rerollOne = true;
  }
  else if (peek(s, 'd') && peekIsNumber(s, 1)) {
    assertToken(s, 'd');
  }
  else {
    return;
  }

  var dn = parseNumber(s, n);
  var ret = new dice(dn);
  if (rerollOne)
    ret = ret.deleteFace(1).combine(ret);

  return ret;
}

function parseArgument(s, n) {
  var ret = parseArgumentInternal(s, n);
  var multiply;
  while (multiply = parseArgumentInternal(s, n)) {
    ret = multiplyDiceByDice(ret, multiply);
  }
  return ret;
}

function parseKeep(s, n) {
  var lowest;
  if (lowest = peek(s, 'l')) {
    assertToken(s, 'l');
  }
  else if (peek(s, 'h')) {
    assertToken(s, 'h');
  }
  else {
    return;
  }

  var keepNumber = parseNumber(s, n);

  var ret = parseArgumentInternal(s, n);
  ret.private.keep = keepN(keepNumber, lowest);
  return ret;
}

function parseArgumentInternal(s, n) {
  if (!s.length)
    return;
  var c = s[0];
  switch (c) {
    case '(':
      s.shift();
      return assertToken(s, ')', parseExpression(s, n));
    case 'h':
    case 'd':
      return parseDice(s, n);
    case 'k':
      assertToken(s, 'k');
      return parseKeep(s, n);
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
    case 'n':
      return parseNumber(s, n);
  }
}

function parseOperation(s) {
  var c = s[0];
  switch (c) {
    case ')':
      return;
    // dc check
    case 'a':
      assertToken(s, 'ac');
      return dice.prototype.ac;
    case 'd':
      assertToken(s, 'dc');
      return dice.prototype.dc;
    case '!':
      assertToken(s, '!');
      return dice.prototype.advantage;
    case '>':
      assertToken(s, '>');
      return dice.prototype.max;
    case '<':
      assertToken(s, '<');
      return dice.prototype.min;
    case '+':
      assertToken(s, '+');
      return dice.prototype.addNonZero;
    case '~':
      assertToken(s, '~');
      assertToken(s, '+');
      return dice.prototype.add;
    case '-':
      assertToken(s, '-');
      return dice.prototype.subtract;
    case '&':
      assertToken(s, '&');
      return dice.prototype.combine;
    case 'r':
      assertToken(s, 'reroll');
      return dice.prototype.reroll;
    case '*':
      assertToken(s, '*');
      return dice.prototype.multiply;
    case '/':
      assertToken(s, '/');
      if (s[0] == '/') {
        assertToken(s, '/');
        return dice.prototype.divideRoundDown;
      } else {
        return dice.prototype.divideRoundUp;
      }
    case '=':
      assertToken(s, '=');
      return dice.prototype.eq;
  }
}

// console variables
d3 = new dice(3);
d4 = new dice(4);
d6 = new dice(6);
d8 = new dice(8);
d10 = new dice(10);
d12 = new dice(12);
d20 = new dice(20);
// halfling d20!
hd20 = d20.deleteFace(1).combine(d20);
