document.addEventListener("DOMContentLoaded", function () {
    const video = document.querySelector("video");
    console.log(video);
    var model;
    var cameraMode = "environment"; // or "user"

    const startVideoStreamPromise = navigator.mediaDevices
        .getUserMedia({
            audio: false,
            video: {
                facingMode: cameraMode
            }
        })
        .then(function (stream) {
            return new Promise(function (resolve) {
                video.srcObject = stream;
                video.onloadeddata = function () {
                    video.play();
                    resolve();
                };
            });
        });

    var publishable_key = "rf_c1iJbxsPllVTnAdayYn67WoGH0C2";
    var toLoad = {
        model: "pote_hole_detection",
        version: 1
    };

    const loadModelPromise = new Promise(function (resolve, reject) {
        roboflow
            .auth({
                publishable_key: publishable_key
            })
            .load(toLoad)
            .then(function (m) {
                model = m;
                resolve();
            });
    });

    Promise.all([startVideoStreamPromise, loadModelPromise]).then(function () {
        document.body.classList.remove("loading");
        resizeCanvas();
        detectFrame();
    });

    var canvas, ctx;
    const font = "16px sans-serif";

    function videoDimensions(video) {
        var videoRatio = video.videoWidth / video.videoHeight;
        var width = video.offsetWidth,
            height = video.offsetHeight;
        var elementRatio = width / height;

        if (elementRatio > videoRatio) {
            width = height * videoRatio;
        } else {
            height = width / videoRatio;
        }

        return {
            width: width,
            height: height
        };
    }

    window.addEventListener("resize", function () {
        resizeCanvas();
    });

    const resizeCanvas = function () {
        if (canvas) canvas.remove();

        canvas = document.createElement("canvas");
        ctx = canvas.getContext("2d");
        var dimensions = videoDimensions(video);

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        canvas.style.width = dimensions.width + "px";
        canvas.style.height = dimensions.height + "px";
        canvas.style.left = (window.innerWidth - dimensions.width) / 2 + "px";
        canvas.style.top = (window.innerHeight - dimensions.height) / 2 + "px";

        document.body.appendChild(canvas);
    };

    const renderPredictions = function (predictions) {
        var dimensions = videoDimensions(video);
        var scale = 1;

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        predictions.forEach(function (prediction) {
            const x = prediction.bbox.x;
            const y = prediction.bbox.y;
            const width = prediction.bbox.width;
            const height = prediction.bbox.height;

            ctx.strokeStyle = prediction.color;
            ctx.lineWidth = 4;
            ctx.strokeRect(
                (x - width / 2) / scale,
                (y - height / 2) / scale,
                width / scale,
                height / scale
            );

            ctx.fillStyle = prediction.color;
            const textWidth = ctx.measureText(prediction.class).width;
            const textHeight = parseInt(font, 10);

            ctx.fillRect(
                (x - width / 2) / scale,
                (y - height / 2) / scale,
                textWidth + 8,
                textHeight + 4
            );
        });

        predictions.forEach(function (prediction) {
            const x = prediction.bbox.x;
            const y = prediction.bbox.y;
            const width = prediction.bbox.width;
            const height = prediction.bbox.height;

            ctx.font = font;
            ctx.textBaseline = "top";
            ctx.fillStyle = "#000000";
            ctx.fillText(
                prediction.class,
                (x - width / 2) / scale + 4,
                (y - height / 2) / scale + 1
            );
        });
    };

    var prevTime;
    var pastFrameTimes = [];
    const detectFrame = function () {
        if (!model) return requestAnimationFrame(detectFrame);

        model.detect(video).then(function (predictions) {
                requestAnimationFrame(detectFrame);
                renderPredictions(predictions);
                console.log(predictions);

                if (prevTime) {
                    pastFrameTimes.push(Date.now() - prevTime);
                    if (pastFrameTimes.length > 30) pastFrameTimes.shift();

                    var total = 0;
                    pastFrameTimes.forEach(function (t) {
                        total += t / 1000;
                    });

                    var fps = pastFrameTimes.length / total;
                    document.getElementById("fps").innerText = Math.round(fps);
                }
                prevTime = Date.now();
            })
            .catch(function (e) {
                console.log("CAUGHT", e);
                requestAnimationFrame(detectFrame);
            });
    };
});
