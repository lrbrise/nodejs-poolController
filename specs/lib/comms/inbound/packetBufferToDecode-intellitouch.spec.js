describe('receives packets from buffer and follows them to decoding', function() {


    describe('#When packets arrive', function() {
        context('via serialport or Socat and ending with Socket.io', function() {

            before(function() {

                global.initAll()
            });

            beforeEach(function() {
                sandbox = sinon.sandbox.create()
                loggerInfoStub = sandbox.stub(bottle.container.logger, 'info')
                loggerWarnStub = sandbox.stub(bottle.container.logger, 'warn')
                loggerVerboseStub = sandbox.stub(bottle.container.logger, 'verbose')
                loggerDebugStub = sandbox.stub(bottle.container.logger, 'debug')
                loggerSillyStub = sandbox.stub(bottle.container.logger, 'silly')
                bottle.container.pump.init()
                updateAvailStub = sandbox.stub(bottle.container.updateAvailable, 'getResults').returns({})
                receiveBufferStub = sandbox.spy(bottle.container.receiveBuffer, 'getProcessingBuffer')
                socketIOSpy = sandbox.spy(bottle.container.io, 'emitToClients')
                iOAOAStub = sandbox.spy(bottle.container.receiveBuffer, 'iterateOverArrayOfArrays')
                queuePacketStub = sandbox.spy(bottle.container.queuePacket, 'queuePacket')
                writeQueueActiveStub = sandbox.stub(bottle.container.writePacket, 'isWriteQueueActive').returns(false)
                writeNetPacketStub = sandbox.stub(bottle.container.sp, 'writeNET')
                writeSPPacketStub = sandbox.stub(bottle.container.sp, 'writeSP')
                bottle.container.queuePacket.queuePacketsArrLength = 0
                bottle.container.temperatures.init()

            })

            afterEach(function() {

                bottle.container.pump.init()
                bottle.container.queuePacket.queuePacketsArrLength = 0
                bottle.container.queuePacket.eject()
                sandbox.restore()

            })

            after(function() {
                bottle.container.settings.logMessageDecoding = 0
                bottle.container.settings.logConfigMessages = 0
                bottle.container.logger.transports.console.level = 'info'
                bottle.container.server.close()
            })


            it('#should set/get the temperature', function(done) {
                var client;
                Promise.resolve()
                    .then(function(){
                        configNeededStub = sandbox.stub(bottle.container.intellitouch, 'checkIfNeedControllerConfiguration')
                        bottle.container.temperatures.getTemperatures().temperature.poolTemp.should.eq(0)
                        bottle.container.packetBuffer.push(new Buffer([255, 0, 255, 165, 16, 15, 16, 8, 13, 53, 53, 42, 83, 71, 0, 0, 0, 39, 0, 0, 0, 0, 2, 62]))
                        client = global.ioclient.connect(global.socketURL, global.socketOptions)
                        client.on('temperature', function(data) {
                            data.temperature.poolTemp.should.eq(53)
                        })
                    })
                    .delay(50)
                    .then(function(){
                        bottle.container.temperatures.getTemperatures().temperature.poolTemp.should.eq(53)
                        client.disconnect()
                    })
                    .then(done,done)
            })

            it('#should recognize an ACK after sending a controller packet', function(done) {

                /*
                09:57:30.478 DEBUG successfulAck: Incoming packet is a match.
                Removing packet 255,0,255,165,33,16,33,203,1,18,1,213 from queuePacketsArr and resetting msgWriteCounter variables
                09:57:30.496 DEBUG postWritePacketHelper: First time writing packet.
                    {"counter":1,"packetWrittenAt":47,"msgWrote":[255,0,255,165,33,16,33,203,1,19,1,214]}
                09:57:30.496 DEBUG writePacketHelper: Setting timeout to write next packet (will call preWritePacketHelper())

                09:57:30.594 DEBUG Msg# 48  Incoming controller packet: 165,33,15,16,11,5,19,0,0,0,0,1,8
                09:57:30.594 DEBUG Msg# 48  Msg received: 165,33,15,16,11,5,19,0,0,0,0,1,8
                                           Msg written: 255,0,255,165,33,16,33,203,1,19,1,214
                                           Match?: true
                09:57:30.595 DEBUG successfulAck: Incoming packet is a match.
                 */
                configNeededStub = sandbox.stub(bottle.container.intellitouch, 'checkIfNeedControllerConfiguration')
                ejectAndResetSpy = sandbox.spy(bottle.container.writePacket, 'ejectPacketAndReset')
                var client;
                Promise.resolve()
                    .then(function() {
                        bottle.container.queuePacket.queuePacket([165,33,16, 33, 203, 1, 19])
                    })
                    .delay(50)
                    .then(function(){
                        bottle.container.packetBuffer.push(new Buffer([255,0,255,165,33,15,16,11,5,19,0,0,0,0,1,8]))
                        ejectAndResetSpy.calledOnce.should.be.true
                    })
                    .then(done,done)
            })


            it('#should recognize an ACK after sending a chlorinator packet', function(done) {

                /*

                17:34:08.391 SILLY pBTA: bufferToProcess length>0;  bufferArrayOfArrays>0.  CONCAT AoA to BTP
                17:34:08.392 SILLY iOAOA: Packet being analyzed: 16,2,0,18,31,132,199,16,3  ******START OF NEW PACKET******
                17:34:08.392 DEBUG Msg# 279  Incoming chlorinator packet: 16,2,0,18,31,132,199,16,3
                17:34:08.392 SILLY Msg# 279   Making sure we have a valid chlorinator packet (matching checksum to actual packet): [16,2,0,18,31,132,199,16,3]
                17:34:08.392 SILLY Msg# 279   Match on Checksum:    199==199   16,2,0,18,31,132,199,16,3
                17:34:08.392 SILLY Msg# 279  Checking to see if inbound message matches previously sent outbound message (isResponse function): 16,2,0,18,31,132,199,16,3  chlorinator
                17:34:08.392 SILLY    isResponse:  Msg#: 279  chatterreceived.action: 31 (10?) === queue[0].action&63: 3 ALL TRUE?  false


                17:34:08.392 DEBUG Msg# 279  Msg received: 16,2,0,18,31,132,199,16,3
                                           Msg written: 16,2,80,17,10,125,16,3
                                           Match?: true
                 */
                configNeededStub = sandbox.stub(bottle.container.intellitouch, 'checkIfNeedControllerConfiguration')
                ejectAndResetSpy = sandbox.spy(bottle.container.writePacket, 'ejectPacketAndReset')
                var client;
                Promise.resolve()
                    .then(function() {
                        bottle.container.queuePacket.queuePacket([16,2,80,17,10,125,16,3])
                    })
                    .delay(50)
                    .then(function(){
                        bottle.container.packetBuffer.push(new Buffer([16,2,0,18,31,132,199,16,3]))
                        ejectAndResetSpy.calledOnce.should.be.true
                    })
                    .then(done,done)
            })



            it('#should recognize an ACK after sending a pump packet', function(done) {

                /*
                7:09:47.298 INFO Pump 1 program changing from:
                    Mode: off     Value: 0    remaining duration: -1
                    to
                    Mode: program     Value: 1    remainingduration: -1
                17:09:47.299 VERBOSE App -> Pump 1: Sending Run Pump Program 1. -1 minutes left. (pump1ProgramTimerMode)

                17:09:47.301 INFO
                    {"text":"Socket pumpCommand variables - pump: 1, program: 1, value: null, duration: -1","pump":1,"program":1,"duration":-1}
                    17:19:34.477 DEBUG Msg# 102  Msg received: 165,0,33,96,4,1,255,2,42
                           Msg written: 255,0,255,165,0,96,33,4,1,255,2,42
                           Match?: true

                 */
                configNeededStub = sandbox.stub(bottle.container.intellitouch, 'checkIfNeedControllerConfiguration')
                ejectAndResetSpy = sandbox.spy(bottle.container.writePacket, 'ejectPacketAndReset')
                var client;
                Promise.resolve()
                    .then(function() {
                        bottle.container.queuePacket.queuePacket([165,0,96,33,4,1,255])
                    })
                    .delay(50)
                    .then(function() {
                        bottle.container.packetBuffer.push(new Buffer([255,0,255,165,0,33,96,4,1,255,2,42]))
                        ejectAndResetSpy.calledOnce.should.be.true
                    })
                    .then(done,done)
            })

        })
    })
})
