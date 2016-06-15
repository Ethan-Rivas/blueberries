var app = angular.module('blueberries', ['ngRoute', 'ui.bootstrap']);

app.config(function($routeProvider) {
  $routeProvider

    .when('/', {
      templateUrl : 'pages/home.tpl.html'
    })

    .when('/blueberries', {
      controller: 'ReadingController',
      templateUrl : 'pages/blueberries.tpl.html'
    })

    .when('/panel', {
      templateUrl : 'pages/panel.tpl.html'
    })
});

app.controller('ReadingController', ['$scope', '$uibModal', function($scope, $uibModal) {
  $scope.status = 'micro';

  $scope.openModal = function() {
    $uibModal.open({
      templateUrl: 'pages/error.tpl.html',
      controller: ['$scope', '$uibModalInstance', function($scope, $uibModalInstance) {
        $scope.cancel = function() {
          $uibModalInstance.dismiss();
        };
      }]
    });
  };
  
  console.log('hola');
  
  // Audio Animation

  function drawBuffer( width, height, context, data ) {
      var step = Math.ceil( data.length / width );
      var amp = height / 2;
      context.fillStyle = "silver";
      context.clearRect(0,0,width,height);
      for(var i=0; i < width; i++){
          var min = 1.0;
          var max = -1.0;
          for (j=0; j<step; j++) {
              var datum = data[(i*step)+j]; 
              if (datum < min)
                  min = datum;
              if (datum > max)
                  max = datum;
          }
          context.fillRect(i,(1+min)*amp,1,Math.max(1,(max-min)*amp));
      }
  }

  window.AudioContext = window.AudioContext || window.webkitAudioContext;

  var audioContext = new AudioContext();
  var audioInput = null,
      realAudioInput = null,
      inputPoint = null,
      audioRecorder = null;
  var lpf = null;
  var rafID = null;
  var analyserContext = null;
  var analyserNode = null;
  var canvasWidth, canvasHeight;

  /* TODO:

  - offer mono option
  - "Monitor input" switch
  */

  function saveAudio() {
      audioRecorder.exportWAV( doneEncoding );
      // could get mono instead by saying
      // audioRecorder.exportMonoWAV( doneEncoding );
  }

  function gotBuffers( buffers ) {
      var canvas = document.getElementById( "wavedisplay" );

      drawBuffer( canvas.width, canvas.height, canvas.getContext('2d'), buffers[0] );

      // the ONLY time gotBuffers is called is right after a new recording is completed - 
      // so here's where we should set up the download.
      audioRecorder.exportWAV( doneEncoding );
  }

  function gotBuffers2( buffers ) {
      var canvas = document.getElementById( "wavedisplay" );

      if (canvas != null) {
          drawBuffer( canvas.width, canvas.height, canvas.getContext('2d'), buffers );
      }
  }


  function doneEncoding( blob ) {
      Recorder.setupDownload( blob, "myRecording" + ((recIndex<10)?"0":"") + recIndex + ".wav" );
      recIndex++;
  }

  function toggleRecording( e ) {
      if (e.classList.contains("recording")) {
          // stop recording
          audioRecorder.stop();
          e.classList.remove("recording");
          audioRecorder.getBuffers( gotBuffers );
      } else {
          // start recording
          if (!audioRecorder)
              return;
          e.classList.add("recording");
          audioRecorder.clear();
          audioRecorder.record();
      }
  }

  function convertToMono( input ) {
      var splitter = audioContext.createChannelSplitter(2);
      var merger = audioContext.createChannelMerger(2);

      input.connect( splitter );
      splitter.connect( merger, 0, 0 );
      splitter.connect( merger, 0, 1 );
      return merger;
  }

  function cancelAnalyserUpdates() {
      window.cancelAnimationFrame( rafID );
      rafID = null;
  }

  function updateAnalysers(time) {
      if (!analyserContext) {
          var canvas = document.getElementById("analyser");
          canvasWidth = canvas.width;
          canvasHeight = canvas.height;
          analyserContext = canvas.getContext('2d');
      }

      // analyzer draw code here
      {
              var SPACING = 4;
              var BAR_WIDTH = 2;
              var numBars = Math.round(canvasWidth);
              var freqByteData = new Uint8Array(analyserNode.frequencyBinCount);

              var bufferLength = analyserNode.frequencyBinCount;
              var dataArray = new Float32Array(bufferLength);
              analyserNode.getFloatTimeDomainData(dataArray);
              // plot "oscilliscope" output
              gotBuffers2(dataArray);

              analyserNode.getByteFrequencyData(freqByteData);

              analyserContext.clearRect(0, 0, canvasWidth, canvasHeight);
              analyserContext.fillStyle = '#F6D565';
              analyserContext.lineCap = 'round';
              var multiplier = analyserNode.frequencyBinCount / numBars;

              // Draw rectangle for each frequency bin.
              for (var i = 0; i < numBars; ++i) {
                  var magnitude = 0;
                  var offset = Math.floor( i * multiplier );
                  // gotta sum/average the block, or we miss narrow-bandwidth spikes
                  for (var j = 0; j< multiplier; j++)
                      magnitude += freqByteData[offset + j];
                  magnitude = magnitude / multiplier;
                  var magnitude2 = freqByteData[i * multiplier];
                  var colorize = true;
                
                  analyserContext.fillStyle = "gray";
                  analyserContext.fillRect(i * SPACING, canvasHeight, BAR_WIDTH, -magnitude);
              }
          }
    
      rafID = window.requestAnimationFrame( updateAnalysers );
  }

  function toggleMono() {
      if (audioInput != realAudioInput) {
          audioInput.disconnect();
          realAudioInput.disconnect();
          audioInput = realAudioInput;
      } else {
          realAudioInput.disconnect();
          audioInput = convertToMono( realAudioInput );
      }

      audioInput.connect(inputPoint);
  }

  function gotStream(stream) {
      inputPoint = audioContext.createGain();

      // Create an AudioNode from the stream.
      realAudioInput = audioContext.createMediaStreamSource(stream);
      audioInput = realAudioInput;
      audioInput.connect(inputPoint);

  //    audioInput = convertToMono( input );

      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 2048;
      inputPoint.connect( analyserNode );

      audioRecorder = new Recorder( inputPoint );

      zeroGain = audioContext.createGain();
      zeroGain.gain.value = 0.0;
      inputPoint.connect( zeroGain );
      zeroGain.connect( audioContext.destination );
      updateAnalysers();
  }

  function initAudio() {
          if (!navigator.getUserMedia)
              navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
          if (!navigator.cancelAnimationFrame)
              navigator.cancelAnimationFrame = navigator.webkitCancelAnimationFrame || navigator.mozCancelAnimationFrame;
          if (!navigator.requestAnimationFrame)
              navigator.requestAnimationFrame = navigator.webkitRequestAnimationFrame || navigator.mozRequestAnimationFrame;

      navigator.getUserMedia(
          {
              "audio": {
                  "mandatory": {
                      "googEchoCancellation": "false",
                      "googAutoGainControl": "false",
                      "googNoiseSuppression": "false",
                      "googHighpassFilter": "false"
                  },
                  "optional": []
              },
          }, gotStream, function(e) {
              alert('Error getting audio');
              console.log(e);
          });
  }

  initAudio();

  (function(window){

    var WORKER_PATH = 'js/recorderWorker.js';

    var Recorder = function(source, cfg){
      var config = cfg || {};
      var bufferLen = config.bufferLen || 4096;
      this.context = source.context;
      if(!this.context.createScriptProcessor){
         this.node = this.context.createJavaScriptNode(bufferLen, 2, 2);
      } else {
         this.node = this.context.createScriptProcessor(bufferLen, 2, 2);
      }
   
      var worker = new Worker(config.workerPath || WORKER_PATH);
      worker.postMessage({
        command: 'init',
        config: {
          sampleRate: this.context.sampleRate
        }
      });
      var recording = false,
        currCallback;

      this.node.onaudioprocess = function(e){
        if (!recording) return;
        worker.postMessage({
          command: 'record',
          buffer: [
            e.inputBuffer.getChannelData(0),
            e.inputBuffer.getChannelData(1)
          ]
        });
      }

      this.configure = function(cfg){
        for (var prop in cfg){
          if (cfg.hasOwnProperty(prop)){
            config[prop] = cfg[prop];
          }
        }
      }

      this.record = function(){
        recording = true;
      }

      this.stop = function(){
        recording = false;
      }

      this.clear = function(){
        worker.postMessage({ command: 'clear' });
      }

      this.getBuffers = function(cb) {
        currCallback = cb || config.callback;
        worker.postMessage({ command: 'getBuffers' })
      }

      this.exportWAV = function(cb, type){
        currCallback = cb || config.callback;
        type = type || config.type || 'audio/wav';
        if (!currCallback) throw new Error('Callback not set');
        worker.postMessage({
          command: 'exportWAV',
          type: type
        });
      }

      this.exportMonoWAV = function(cb, type){
        currCallback = cb || config.callback;
        type = type || config.type || 'audio/wav';
        if (!currCallback) throw new Error('Callback not set');
        worker.postMessage({
          command: 'exportMonoWAV',
          type: type
        });
      }

      worker.onmessage = function(e){
        var blob = e.data;
        currCallback(blob);
      }

      source.connect(this.node);
      this.node.connect(this.context.destination);   // if the script node is not connected to an output the "onaudioprocess" event is not triggered in chrome.
    };

    Recorder.setupDownload = function(blob, filename){
      var url = (window.URL || window.webkitURL).createObjectURL(blob);
      var link = document.getElementById("save");
      link.href = url;
      link.download = filename || 'output.wav';
    }

    window.Recorder = Recorder;
    window.hola = 'hola';

  })(window);
}]);