const canvas = document.querySelector("#canvas")
const context = canvas.getContext("2d")

let balls = []
let chunks = []
let chunksSize = {
    width: 0,
    height: 0,
}

function resizeHandler(){
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
}

window.addEventListener("resize", resizeHandler)
resizeHandler()

const props = {
    balls: 500,

    gravityX: 0,
    gravityY: 0.1,

    friction: 0.99,
    bounce: 0.9,

    size: 24,
    sizeRandom: 0.6,

    background: [30, 20, 100],
    hot: [180, 0, 100],
    cold: [255, 180, 180],

    trail: 50,

    maxSpeed: 3,
    constantSpeed: false,

    chunkSize: 4,
    chunkRadius: 1,

    heatDelay: 20,

    touchRadius: 50,
}

const gui = new dat.GUI()
gui.add(props, "balls", 50, 3000).step(1).name("Balls")
.onChange(value => {
    let diff = value - balls.length

    for(let i = 0; i < Math.abs(diff); i++){
        if(diff < 0) removeBall(balls[balls.length - 1])
        else addBall()
    }
})

gui.add(props, "size", 16, 32).step(0.001).name("Size")
gui.add(props, "sizeRandom", 0, 1).step(0.001).name("Random Size")

gui.addColor(props, "background").name("Background")
gui.add(props, "trail", 0, 100).step(0.1).name("Trail")
gui.addColor(props, "hot").name("Hot")
gui.addColor(props, "cold").name("Cold")

gui.add(props, "gravityX", -.1, .1).step(0.01).name("Gravity X")
gui.add(props, "gravityY", -.1, .1).step(0.01).name("Gravity Y")

gui.add(props, "friction", 0.9, 1).step(0.001).name("Friction")
gui.add(props, "bounce", 0.5, 1).step(0.1).name("Bounce")

gui.add(props, "maxSpeed", 1, 7).step(0.001).name("Max Speed")
gui.add(props, "constantSpeed").name("Constant Speed")

let touches = []

function mouseHandler(e){
    let mouse = touches.find(touch => touch.id == "mouse")
    let x = e.pageX
    let y = e.pageY

    if(e.type === "mousedown"){
        mouse = {
            id: "mouse",
            x,
            y,
            vx: 0,
            vy: 0,
        }

        touches.push(mouse)
    }

    if(mouse){
        mouse.vx = x - mouse.x
        mouse.vy = y - mouse.y
        mouse.x = x
        mouse.y = y

        if(e.type === "mouseup"){
            touches.splice(touches.indexOf(mouse), 1)
        }
    }
}

window.addEventListener("mousedown", mouseHandler)
window.addEventListener("mousemove", mouseHandler)
window.addEventListener("mouseup", mouseHandler)

function touchHandler(e){
    let ids = ["mouse"]
    for(let i = 0; i < e.touches.length; i++){
        let finger = e.touches[i]
        let x = finger.pageX
        let y = finger.pageY
        // Find in array
        let touch = touches.find(touch => touch.id === finger.identifier)
        // if not in array, add
        if(!touch){
            touch = {
                id: finger.identifier,
                x,
                y,
                vx: 0,
                vy: 0,
            }
            touches.push(touch)
        }

        // update
        touch.vx = x - touch.x
        touch.vy = y - touch.y
        touch.x = x
        touch.y = y
        ids.push(touch.id)
    }

    for(let touch of touches){
        if(!ids.includes(touch.id)){
            touches.splice(touches.indexOf(touch), 1)
        }
    }
}

window.addEventListener("touchstart", touchHandler)
window.addEventListener("touchmove", touchHandler)
window.addEventListener("touchend", touchHandler)

function addBall(x = canvas.width / 2 + (0.5 - Math.random()), y = canvas.height / 2 + (0.5 - Math.random())){
    let ball = {
        x, y,
        vx: 0, vy: 0,
        random: Math.random(),

        chunkIndex: 0,
        color: 0,

        radius: 1,
        mass: 1,

        bumps: 0,
        bumpRatio: 1,
        heat: 0,
    }
    balls.push(ball)
    return ball
}

function removeBall(ball){
    if(ball.chunkIndex < chunks.length){
        let ballIndex = chunks[ball.chunkIndex].indexOf(ball)
        if(ballIndex !== -1) chunks[ball.chunkIndex].splice(ballIndex, 1)
        balls.splice(balls.indexOf(ball), 1)
    }
}

for(let i = 0; i < props.balls; i++) addBall()

function updateChunks(){
    let width = (canvas.width >> props.chunkSize) + 1
    let height = (canvas.height >> props.chunkSize) + 1

    if(chunksSize.width != width || chunksSize.height != height){
        chunks = new Array(width * height).fill(0).map(i => [])
        chunksSize.width = width
        chunksSize.height = height
    }

    for(let ball of balls){
        let cx = ball.x >> props.chunkSize
        let cy = ball.y >> props.chunkSize
        let chunkIndex = cx + cy * chunksSize.width

        if(ball.chunkIndex == chunkIndex){
            // Ball is in the right chunk
        } else{
            // Remove ball from previous chunk
            if(ball.chunkIndex < chunks.length){
                let ballIndex = chunks[ball.chunkIndex].indexOf(ball)
                if(ballIndex !== -1) chunks[ball.chunkIndex].splice(ballIndex, 1)
            }
            // Add ball to correct chunk
            if(chunkIndex > 0 && chunkIndex < chunks.length){
                chunks[chunkIndex].push(ball)
                ball.chunkIndex = chunkIndex
            }
        }
    }
}

updateChunks()

function loop(){
    // Update
    updateChunks()
    for(let ball of balls){
        ball.radius = (props.size - (0.5 * props.size * ball.random * props.sizeRandom)) / 2
        ball.mass = Math.PI * ball.radius * ball.radius
        ball.bumps = 0
    }

    for(let i = 0; i < chunks.length; i++){
        let cx = i % chunksSize.width
        let cy = Math.floor(i / chunksSize.width)
        let chunkBalls = []
        for(let x = -props.chunkRadius; x <= props.chunkRadius; x++){
            for(let y = -props.chunkRadius; y <= props.chunkRadius; y++){
                let chunkIndex = (cx + x) + (cy + y) * chunksSize.width
                if(chunkIndex >= 0 && chunkIndex < chunks.length){
                    chunkBalls = chunkBalls.concat(chunks[chunkIndex])
                }
            }
        }

        if(chunkBalls.length > 1){
            for(let a of chunkBalls){
                for(let b of chunkBalls){
                    if(a !== b){
                        let dx = b.x - a.x
                        let dy = b.y - a.y
                        let dist = Math.sqrt(dx * dx + dy * dy)
                        let diff = ((a.radius + b.radius) - dist) / dist
                        let s1 = (1 / a.mass) / ( (1 / a.mass) + (1 / b.mass) )
                        let s2 = 1 - s1

                        if(dist < a.radius + b.radius){
                            let ex = dx * diff
                            let ey = dy * diff

                            a.x -= ex * s1
                            a.y -= ey * s1
                            a.vx -= ex * s1
                            a.vy -= ey * s1

                            b.x += ex * s2
                            b.y += ey * s2
                            b.vx += ex * s2
                            b.vy += ey * s2

                            a.bumps++
                            b.bumps++
                        }
                    }
                }
            }
        }
    }

    let maxBumps = 0

    for(let ball of balls){
        if(ball.x - ball.radius < 0){
            ball.x = ball.radius
            ball.vx *= -props.bounce
            ball.bumps ++
        }

        if(ball.y - ball.radius < 0){
            ball.y = ball.radius
            ball.vy *= -props.bounce
            ball.bumps ++
        }

        if(ball.x + ball.radius > canvas.width){
            ball.x = canvas.width - ball.radius
            ball.vx *= -props.bounce
            ball.bumps ++
        }

        if(ball.y + ball.radius > canvas.height){
            ball.y = canvas.height - ball.radius
            ball.vy *= -props.bounce
            ball.bumps ++
        }

        maxBumps = Math.max(ball.bumps, maxBumps, 10)

        ball.vx += props.gravityX
        ball.vy += props.gravityY

        ball.vx *= props.friction
        ball.vy *= props.friction

        let vel = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy)
        vel = props.constantSpeed ? props.maxSpeed : Math.min(props.maxSpeed, vel)

        let angle = Math.atan2(ball.vy, ball.vx)
        ball.vx = Math.cos(angle) * vel
        ball.vy = Math.sin(angle) * vel

        ball.x += ball.vx
        ball.y += ball.vy
    }

    for(let ball of balls){
        ball.bumpRatio = Math.sqrt(ball.bumps/maxBumps)
        ball.heat += (ball.bumpRatio - ball.heat) / props.heatDelay
    }

    // Draw
    const backgroundAlpha = 0.1 * (1 - props.trail/100)
    context.fillStyle = `rgba(${props.background[0]}, ${props.background[1]}, ${props.background[2]}, ${backgroundAlpha})`
    context.fillRect(0, 0, canvas.width, canvas.height)

    for(let ball of balls){
        const ratio = ball.heat
        const r = props.cold[0] + (props.hot[0] - props.cold[0]) * ratio 
        const g = props.cold[1] + (props.hot[1] - props.cold[1]) * ratio 
        const b = props.cold[2] + (props.hot[2] - props.cold[2]) * ratio 
        context.fillStyle = `rgb(${r}, ${g}, ${b})`
        context.beginPath()
        context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
        context.fill()
    }

    requestAnimationFrame(loop)
}

loop()