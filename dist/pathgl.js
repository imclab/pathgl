! function() {
pathgl.shaderParameters = {
  rgb: [0, 0, 0, 0]
, translate: [0, 0]
, time: [0]
, rotation: [0, 1]
, opacity: [1]
, resolution: [0, 0]
, scale: [1, 1]
, mouse: pathgl.mouse = [0, 0]
}

pathgl.fragment = [ "precision mediump float;"
                  , "uniform vec4 rgb;"
                  , "uniform float time;"
                  , "uniform float opacity;"
                  , "uniform vec2 resolution;"

                  , "void main(void) {"
                  , "  gl_FragColor = vec4(rgb.xyz, opacity);"
                  , "}"
                  ].join('\n')

pathgl.vertex = [ "precision mediump float;"
                , "attribute vec3 aVertexPosition;"
                , "uniform vec2 translate;"
                , "uniform vec2 resolution;"
                , "uniform vec2 rotation;"
                , "uniform vec2 scale;"

                , "void main(void) {"

                , "vec3 pos = aVertexPosition;"
                , "pos.y = resolution.y - pos.y;"

                , "vec3 scaled_position = pos * vec3(scale, 1.0);"

                , "vec2 rotated_position = vec2(scaled_position.x * rotation.y + scaled_position.y * rotation.x, "
                + "scaled_position.y * rotation.y - scaled_position.x * rotation.x);"

                , "vec2 position = vec2(rotated_position.x + translate.x, rotated_position.y - translate.y);"

                , "vec2 zeroToOne = position / resolution;"
                , "vec2 zeroToTwo = zeroToOne * 2.0;"
                , "vec2 clipSpace = zeroToTwo - 1.0;"

                , "gl_Position = vec4(clipSpace, 1, 1);"

                , "}"
                ].join('\n')
;this.pathgl = pathgl

pathgl.stop = d3.functor()

function pathgl(canvas) {
  var gl, program, programs
  canvas = 'string' == typeof canvas ? document.querySelector(canvas) :
    canvas instanceof d3.selection ? canvas.node() :
    canvas
;var stopRendering = false
pathgl.stop = function () { stopRendering = true }
function init(c) {
  canvas = c
  programs = canvas.programs = (canvas.programs || {})
  pathgl.shaderParameters.resolution = [canvas.width, canvas.height]
  gl = initContext(canvas)
  initShader(pathgl.fragment, '_identity')
  override(canvas)
  d3.select(canvas).on('mousemove.pathgl', mousemoved)
  d3.timer(function (elapsed) {
    //if (canvas.__rerender__ || pathgl.forceRerender)
    each(programs, function (program, key) {
      gl.useProgram(program)
      program.time && gl.uniform1f(program.time, pathgl.time = elapsed / 1000)
      program.mouse && gl.uniform2fv(program.mouse, pathgl.mouse)
    })
    canvas.__scene__.forEach(render)
    return stopRendering && ! gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT)
  })
  return gl ? canvas : null
}

function mousemoved() {
  var m = d3.mouse(this)
  pathgl.mouse = [m[0] / innerWidth, m[1] / innerHeight]
}

function override(canvas) {
  return extend(canvas, {
    appendChild: appendChild
  , querySelectorAll: querySelectorAll
  , querySelector: querySelector
  , removeChild: removeChild
  , insertBefore: insertBefore

  , gl: gl
  , __scene__: []
  , __pos__: []
  , __id__: 0
  , __program__: void 0
  })
}

function compileShader (type, src) {
  var shader = gl.createShader(type)
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (! gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw src + ' ' + gl.getShaderInfoLog(shader)
  return shader
}

pathgl.initShader
function initShader(fragment, name) {
  if (programs[name]) return program = programs[name]

  program = gl.createProgram()

  var vertexShader = compileShader(gl.VERTEX_SHADER, pathgl.vertex)
  var fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragment)

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)

  gl.linkProgram(program)
  gl.useProgram(program)

  if (! gl.getProgramParameter(program, gl.LINK_STATUS)) throw name + ': ' + gl.getProgramInfoLog(program)

  each(pathgl.shaderParameters, bindUniform)
  program.vertexPosition = gl.getAttribLocation(program, "aVertexPosition")
  gl.enableVertexAttribArray(program.vertexPosition)

  program.name = name
  return programs[name] = program
}

function bindUniform(val, key) {
  program[key] = gl.getUniformLocation(program, key)
  if (val) gl['uniform' + val.length + 'fv'](program[key], val)
}

function initContext(canvas) {
  var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
  return gl && extend(gl, { viewportWidth: canvas.width, viewportHeight: canvas.height })
};  var methods = { m: moveTo
                , z: closePath
                , l: lineTo

                , h: horizontalLine
                , v: verticalLine
                , c: curveTo
                , s: shortCurveTo
                , q: quadraticBezier
                , t: smoothQuadraticBezier
                , a: elipticalArc
                }

function horizontalLine() {}
function verticalLine() {}
function curveTo() {}
function shortCurveTo() {}
function quadraticBezier() {}
function smoothQuadraticBezier () {}
function elipticalArc(){}

function group(coords) {
  var s = []
  twoEach(coords, function (a, b) { s.push([a, b, 0]) })
  return s
}

function parse (str) {
  var path = addToBuffer(this)

  if (path.length) return render()

  str.match(/[a-z][^a-z]*/ig).forEach(function (segment, i, match) {
    var instruction = methods[segment[0].toLowerCase()]
      , coords = segment.slice(1).trim().split(/,| /g)

    ;[].push.apply(path.coords, group(coords))
    if (! instruction) return
    if (instruction.name == 'closePath' && match[i+1]) return instruction.call(path, match[i+1])

    if ('function' == typeof instruction)
      coords.length == 1 ? instruction.call(path) : twoEach(coords, instruction, path)
    else
      console.error(instruction + ' ' + segment[0] + ' is not yet implemented')
  })
  var buff = toBuffer(this.path.coords)
  this.path.length = 0
  this.path.push(buff)
}

function moveTo(x, y) {
  pos = [x, y]
}

var subpathStart
function closePath(next) {
  subpathStart = pos
  lineTo.apply(this, /m/i.test(next) ? next.slice(1).trim().split(/,| /g) : this.coords[0])
}

function lineTo(x, y) {
  this.push(x, y, 0)
}
;function svgDomProxy(el, canvas) {}

var types = {
  circle: noop
, ellipse: noop
, line: noop
, path: noop
, polygon: noop
, polyline: noop
, rect: noop

, image: noop
, text: noop
, g: noop
, use: noop
}

var roundedCorner = noop

var proto = {
  circle: { r: circlePoints, cx: noop, cy: noop }
, ellipse: {cx: ellipsePoints, cy: ellipsePoints, rx: ellipsePoints, ry: ellipsePoints}
, line: { x1: buildLine, y1: buildLine, x2: buildLine, y2: buildLine }
, path: { d: buildPath, pathLength: buildPath}
, polygon: { points: points }
, polyline: { points: points }
, rect: { width: rectPoints, height: rectPoints, x: noop, y: noop, rx: roundedCorner }
, image: { 'xlink:href': noop, height: noop, width: noop, x: noop, y: noop }
, text: { x: noop, y: noop, dx: noop, dy: noop }
, g: { appendChild: noop }
, image: { 'xlink:href': noop, height: noop, width: noop, x: noop, y: noop }
}

svgDomProxy.prototype = {
  querySelectorAll: noop
, querySelector: noop
, createElementNS: noop
, insertBefore: noop
, ownerDocument: { createElementNS: noop }
, nextSibling: function () { canvas.scene[canvas.__scene__.indexOf()  + 1] }

, height: function () {
    addToBuffer(this)
    this.path.coords = rectPoints(this.attr.width, this.attr.height)
    extend(this.path, [buildBuffer(this.path.coords)])
    this.buffer = buildBuffer(this.path.coords)
  }

, width: function () {
   addToBuffer(this)
   this.path.coords = rectPoints(this.attr.width, this.attr.height)
   extend(this.path, [buildBuffer(this.path.coords)])
   this.buffer = buildBuffer(this.path.coords)
 }

, r: function () {
    this.path = [this.buffer = toBuffer(circlePoints(this.attr.r))]
  }

, fill: function (val) {
    isId(val) && initShader(d3.select(val).text(), val)
  }

, transform: function (d) {
    var parse = d3.transform(d)
      , radians = parse.rotate * Math.PI / 180
    if (parse.rotate) {

      delete parse.translate
      // parse.translate[0] *= -68
      // parse.translate[1] *= 68
    }
    extend(this.attr, parse, { rotation: [ Math.sin(radians), Math.cos(radians) ] })
  }

, d: function (d) {
    parse.call(this, d)
    this.buffer = toBuffer(this.path.coords)
  }

, stroke: function (val) {
    isId(val) && initShader(d3.select(val).text(), val)
  }

  , getAttribute: function (name) {
      return this.attr[name]
    }

  , setAttribute: function (name, value) {
      this.attr[name] = value
      this[name] && this[name](value)
    }

  , removeAttribute: function (name) {
      delete this.attr[name]
    }

  , textContent: noop
  , removeEventListener: noop
  , addEventListener: event
  }

var types = [
  function circle () {}
, function rect() {}
, function path() {}
].reduce(function (a, type) {
              a[type.name] = type
              type.prototype = Object.create(svgDomProxy.prototype)
              return a
            }, {})

function insertBefore(node, next) {}

function appendChild(el) {
  var self = new types[el.tagName.toLowerCase()]
  canvas.__scene__.push(self)

  self.attr = Object.create(attrDefaults)
  self.tagName = el.tagName
  self.parentNode = self.parentElement = this
  return self
}

function querySelector(query) {
  return this.querySelectorAll(query)[0]
}

function querySelectorAll(query) {
  return this.__scene__.filter(function (node) { return node.tagName.toLowerCase() === query })
}

function removeChild(el) {
  var i = this.__scene__.indexOf(el)
  this.__scene__.splice(i, 1)
}

var attrDefaults = {
  rotation: [0, 1]
, translate: [0, 0]
, scale: [1, 1]
, fill: 0
, stroke: 0
, 'stroke-width': 2
, cx: 0
, cy: 0
, x: 0
, y: 0
, opacity: 1
}
var e = {}

//keep track of what element is being hovered over
function event (type, listener) {
  //console.log(this.id)
  if (! e[type]) {
    d3.select('canvas').on(type, function () {
      this.__scene__.filter(function () {
        //check what shape cursor is on top of
        //if the id is in e[type], dispatch listener
      })
    })
    e[type] = []
  }
  e[type].push(this.id)
};function drawScene(order) {
  render(order.head)
  order.next && drawScene(order.next)
}

function ref(i) {
  return { index: i, id: __scene__[i].id }
}


function buildScene() {
  var order = {}, last, l = __scene__.length
  reverseEach(__scene__, function (_, i) {
    var node  = ref(l - i)
      , next = (order[node.attr.fill] ||order[node.attr.fill] = new List()).cons(node)
    if (last !== node.attr.fill) order[last].cons(next)
    last = node.attr.fill
  })
  order.head  = __scene__[l - 1]
  return order
}

function addToBuffer(datum) {
  return extend(datum.path = [], { coords: [], id: datum.id })
}

function applyTransforms(node) {
  gl.uniform2f(program.translate, node.attr.translate[0] + node.attr.cx + node.attr.x,
               node.attr.translate[1] + node.attr.cy + node.attr.y)
  gl.uniform2f(program.scale, node.attr.scale[0], node.attr.scale[1])
  gl.uniform2f(program.rotation, node.attr.rotation[0], node.attr.rotation[1])
  gl.uniform1f(program.opacity, node.attr.opacity)
}

function drawBuffer(buffer, type) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.vertexAttribPointer(program.vertexPosition, buffer.itemSize, gl.FLOAT, false, 0, 0)
  gl.drawArrays(type, 0, buffer.numItems)
}

function swapProgram(name) {
  gl.useProgram(program = programs[name])
  program.vertexPosition = gl.getAttribLocation(program, "aVertexPosition")
  gl.enableVertexAttribArray(program.vertexPosition)
}

function drawFill(node) {
  swapProgram(isId(node.attr.fill) ? node.attr.fill : '_identity')
  applyTransforms(node)
  setDrawColor(d3.rgb(node.attr.fill))
  drawBuffer(node.buffer, gl.TRIANGLE_FAN)
}

function render(node) {
  node.buffer && drawFill(node)
  drawStroke(node)
}

function drawStroke(node) {
  gl.lineWidth(node.attr['stroke-width'])
  swapProgram(isId(node.attr.stroke) ? node.attr.stroke : '_identity')
  applyTransforms(node)
  setDrawColor(d3.rgb(node.attr.stroke))
  if (node.path)
    for (var i = 0; i < node.path.length; i++)
      drawBuffer(node.path[i], gl.LINE_LOOP)
  //else console.log(node.id)
  //this should be impossible
}

function setDrawColor (c) {
  gl.uniform4f(program.rgb,
               c.r / 256,
               c.g / 256,
               c.b / 256,
               1.0)
}

//subData
function buildBuffer(points) {
  var buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW)
  buffer.itemSize = 3
  buffer.numItems = points.length / buffer.itemSize
  return buffer
}

function toBuffer (array) {
  return buildBuffer(flatten(array))
}

function circlePoints(r) {
  var a = []
  for (var i = 0; i < 361; i+=18)
    a.push(50 + r * Math.cos(i * Math.PI / 180),
           50 + r * Math.sin(i * Math.PI / 180),
           0)
  return a
}


function buildLine () {}
function buildPath () {}
function points () {}
function ellipsePoints(r) {
  var a = []
  for (var i = 0; i < 361; i+=18)
    a.push(50 + r * Math.cos(i * Math.PI / 180),
           50 + r * Math.sin(i * Math.PI / 180),
           0)
  return a
}

function rectPoints(w, h) {
  return [0,0,0,
          0,h,0,
          w,h,0,
          w,0,0,
         ]
}
;pathgl.shaderParameters = {
  rgb: [0, 0, 0, 0]
, translate: [0, 0]
, time: [0]
, rotation: [0, 1]
, opacity: [1]
, resolution: [0, 0]
, scale: [1, 1]
, mouse: pathgl.mouse = [0, 0]
}

pathgl.fragment = [ "precision mediump float;"
                  , "uniform vec4 rgb;"
                  , "uniform float time;"
                  , "uniform float opacity;"
                  , "uniform vec2 resolution;"

                  , "void main(void) {"
                  , "  gl_FragColor = vec4(rgb.xyz, opacity);"
                  , "}"
                  ].join('\n')

pathgl.vertex = [ "precision mediump float;"
                , "attribute vec3 aVertexPosition;"
                , "uniform vec2 translate;"
                , "uniform vec2 resolution;"
                , "uniform vec2 rotation;"
                , "uniform vec2 scale;"

                , "void main(void) {"

                , "vec3 pos = aVertexPosition;"
                , "pos.y = resolution.y - pos.y;"

                , "vec3 scaled_position = pos * vec3(scale, 1.0);"

                , "vec2 rotated_position = vec2(scaled_position.x * rotation.y + scaled_position.y * rotation.x, "
                + "scaled_position.y * rotation.y - scaled_position.x * rotation.x);"

                , "vec2 position = vec2(rotated_position.x + translate.x, rotated_position.y - translate.y);"

                , "vec2 zeroToOne = position / resolution;"
                , "vec2 zeroToTwo = zeroToOne * 2.0;"
                , "vec2 clipSpace = zeroToTwo - 1.0;"

                , "gl_Position = vec4(clipSpace, 1, 1);"

                , "}"
                ].join('\n')
;function noop () {}

function extend (a, b) {
  if (arguments.length > 2) [].forEach.call(arguments, function (b) { extend(a, b) })
  else for (var k in b) a[k] = b[k]
  return a
}

function twoEach(list, fn, gl) {
  var l = list.length - 1, i = 0
  while(i < l) fn.call(gl, list[i++], list[i++])
}

function flatten(input) {
  return input.reduce(function (a, b) { return (b && b.map ? [].push.apply(a, b) : a.push(b)) && a },
                      [])
}

function isId(str) {
  return str[0] == '#' && isNaN(parseInt(str.slice(1), 16))
}

function each(obj, fn) {
  for (var key in obj) fn(obj[key], key, obj)
}


function List(data) {
  this.data = data || null
  this.next = null
}

List.prototype = {
  cons: function (data) {
    if (! this.data) this.next = new List(data)
    this.data = data
    return this
  }
, remove: function (data, parent) {
    return (this.next != null) &&
      this.data == data ? this.parent.next = this :
      this.next.remove(data, parent)
  }
, each: function (fn) { fn(this.data), this.next && this.next.each(fn) }
, car: function () { return this.head }
, cdr: function () { return this.tail }
}

function reverseEach(arr, fn) {
  var l = arr.length
  while(l--) fn(arr[l], l)
};  return init(canvas)
} }()