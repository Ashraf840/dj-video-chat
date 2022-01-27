import json
from channels.generic.websocket import AsyncWebsocketConsumer


# define asynchronous functions inside a class which will extend the AsyncWebsocketConsumer
class ChatConsumer(AsyncWebsocketConsumer):
    # a client (browser) will connect to this consumer using this following func
    async def connect(self):
        # instantiate a room-group-name (initially there will be only one group-room for now)
        self.room_group_name = 'Test-Room'
        print('A room group %s is created!' % self.room_group_name)
        print('Channel Name ("connect" method):', self.channel_name)
        print('Unique channel name is generated each time a peer connects with the consumer using django-channels!')

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        # accept the peer connection
        await self.accept()
        print('Connected (Backend Channel Consumer)!')



    # a client (browser) will receive request/msg requests in real-time using this consumer's func
    # from our JS websocket, we're going to send a js-dict in json format to this dj-consumer.
    # but when we receive the json-dict-data, we need to de-serialize the dictionary using the "json.loads()". Now it'll become a python dict.
    async def receive(self, text_data):
        receive_dict = json.loads(text_data)   # convert the json-dict into python-dict
        message = receive_dict['message']     # extract the message from the converted-python-dict, cause we're going to send a dict which has that msg attribute.
        action = receive_dict['action']       # retrieve the "action" key-value
        # [NOTE]:  Thus, we need to construct an object (dictionary) with a 'message'-key from the frontend & then serialize that into JSON-obj before sending that into the backend consumer.

        print('The payload (sent from the frontend):', message)

        # this code-block is build after creating the offer-SDP in the frontend JS.
        # for sending offer/answer SDPs, create a condition based on the "action" value & send another payload which is meant to share the SDP to the peers
        # this offer-SDP sending process needs to be handled in the frontend as well
        if (action == 'new-offer') or (action == 'new-answer'):
            print('New Offer is going to be created!')
            print('#'*50)
            print('Channel - newly joined peer channel: ', receive_dict['message']['receiver_channel_name'])
            print('Channel - existing peer channel: ', self.channel_name)
            print('#'*50)
            # store the receiver-channel-name from the payload sent from the frontend
            receiver_channel_name = receive_dict['message']['receiver_channel_name']
            print('Receiver Channel Name (sent from the frontend - Newly Joined Peers Channel):', receiver_channel_name)
            message['receiver_channel_name'] = self.channel_name
            print('Backend Channel Name (built while anyone instantiate the channel):', message['receiver_channel_name'])

            # send the offer-sdp specifically to the newly-joined-peer.
            await self.channel_layer.send(
                # send the specific channel, to the specific peer
                receiver_channel_name,
                {
                    # [Compulsory Key] define the type, which will be corresponding to the async-func-name. The mentioning func ("send_sdp") will be used by the consumer to send the dict/msg to all the peers of the group.
                    'type': 'send_sdp',
                    # payload, received from a client (peer) of a room/group
                    # 'payload': message,
                    'receive_dict': receive_dict,  # contains the 'peer', 'action', 'message' key-value pairs
                }
            )


        # the "text_data" will contain the message as a "dict".
        # Thus, we'll assign a new KEY-VALUE pair in the sub-dict contained by the message-dict.
        # This key-value pair will contain the channel_name
        # [NB]:  Both the existing-peers & the newly-joined-peers will connect with the backend-dj-channel & get a unique-channel-name.
        #   This channels will also be dispatched to every peers' frontend.
        message['receiver_channel_name'] = self.channel_name

        # now we will send/broadcast the msg to all the other peers of the group.
        await self.channel_layer.group_send(
            # send the room-group-name
            self.room_group_name,
            {
                # [Compulsory Key] define the type, which will be corresponding to the async-func-name. The mentioning func ("send_sdp") will be used by the consumer to send the dict/msg to all the peers of the group.
                'type': 'send_sdp',
                # payload, received from a client (peer) of a room/group
                # 'payload': message,
                'receive_dict': receive_dict,   # contains the 'peer', 'action', 'message' key-value pairs
            }
        )

    # this func will be used while send the msg-payload to each peer of the group/room.
    # [NB]:  rename the "send_message" to "send_sdp"
    async def send_sdp(self, event):
        payload = event['receive_dict']  # get the key from the "channel_layer.group_send()" method
        # broadcast the msg to all the peers of the group through channels. Using param "text_data" & serialize the python-dict into a json-dict using the "json.dumps()" message.
        await self.send(text_data=json.dumps({
            'payload': payload,
        }))


    # a client (browser) will disconnect from this consumer using this following func
    async def disconnect(self, close_code):
        # [NOTE]:  Whenever a user disconnects the, they simply discards their channel-names fom the group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        print('Disconnected (Backend Channel Consumer)!')

