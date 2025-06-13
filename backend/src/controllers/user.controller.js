import User from '../models/User.js';

export async function getRecommendedUsers(req, res) {
    try {
        const currentUserId = req.user.id;
        const currentUser = req.user;

        const recommendedUsers = await User.find({
            $and:[
                {_id: { $ne: currentUserId } }, // Exclude current user
                {$id: { $nin: currentUser.friends } }, // Exclude friends
                {isOnboarded: true} // Only onboarded users
            ]
        })
        res.status(200).json ( recommendedUsers);
    } catch (error) {
        console.error(" Error in  getRecommendedUsers controller:", error.message);
        res.status(500).json({
            message: 'Internal Server Error', 
        });
    }
}

export async function getMyFriends(req, res) {
    try {
        const user = await User.findById(req.user._id).select("friends").populate("friends", "fullname profilePic nativeLanguage learningLanguage");

        res.status(200).json(user.friends);
    } catch (error) {
        console.error("Error in getMyFriends controller:", error.message);
        res.status(500).json({
            message: 'Internal Server Error',
        });
    }

}

export async function sendFriendRequest(req, res) {
    try {
        const myId = req.user.id;
        const { id: recepientId } = req.params;

        //prevent sending friend request to self

        if (myId === recepientId) {
            return res.status(400).json({ message: "You cannot send a friend request to yourself." });
        }

        const recepient = await User.findById(recepientId);
        if (!recepient) {
            return res.status(404).json({ message: "Recepient not found." });
        }
        // Check if the recepient is already a friend
        if (recepient.friends.includes(myId)) {
            return res.status(400).json({ message: "You are already friends with this user." });
        }
        // Check if a friend request already exists
        const existingRequest = await FriendRequest.findOne({
            $or: [
                { sender: myId, recipient: recepientId },
                { sender: recepientId, recipient: myId }
            ],

        });
        if (existingRequest) {
            return res.status(400).json({ message: "Friend request already exists between you and the user." });
        }

        const friendRequest = await FriendRequest.create({
            sender: myId,
            recipient: recepientId,
        });

        res.status(201).json({ message: "Friend request sent successfully.", friendRequest });
    } catch (error) {
        console.error("Error in sendFriendRequest controller:", error.message);
        res.status(500).json({
            message: 'Internal Server Error',
        });
    }
}

export async function acceptFriendRequest(req, res) {
    try {
        
        const { id: requestId } = req.params;
        const friendRequest = await FriendRequest.findById(requestId);

        if (!friendRequest) {
            return res.status(404).json({ message: "Friend request not found." });
        }

        // Check if the current user is the recipient of the request
        if (friendRequest.recipient.toString() !== req.user.id) {
            return res.status(403).json({ message: "You are not authorized to accept this friend request." });
        }

        friendRequest.status = 'accepted';
        await friendRequest.save();

        //add each user to the other's friend's array
        //$addToSet ensures that the user is added only if they are not already in the array
        await User.findByIdAndUpdate(
            friendRequest.sender,
            { $addToSet: { friends: friendRequest.recipient }, 
        });
        await User.findByIdAndUpdate(
            friendRequest.recipient, 
            { $addToSet: { friends: friendRequest.sender }, 
        });
        res.status(200).json({ message: "Friend request accepted successfully." });
    } catch (error) {
        console.error("Error in acceptFriendRequest controller:", error.message);
        res.status(500).json({
            message: 'Internal Server Error',
        });
        
    }

}

export async function getFriendRequests(req, res) { 
    try {
        const incomingReqs = await FriendRequest.find({ 
            recipient: req.user.id, 
            status: 'pending' 
        }) .populate('sender', 
            'fullname profilePic nativeLanguage learningLanguage');

        const acceptedReqs = await FriendRequest.find({ 
            recipient: req.user.id, 
            status: 'accepted' 
        }).populate('sender', 'fullname profilePic');

        res.status(200).json({incomingReqs, acceptedReqs});
    } catch (error) {
        console.log("Error in getFriendRequests controller:", error.message);
        res.status(500).json({
            message: 'Internal Server Error',
        });
        
    }
}

export async function getOutgoingFriendRequests(req, res) { 
    try {
        const outgoingReqs = await FriendRequest.find({ 
            sender: req.user.id, 
            status: 'pending' 
        }).populate('recipient', 'fullname profilePic nativeLanguage learningLanguage');

        res.status(200).json(outgoingReqs);
    
        res.status(200).json(outgoingReqs);
        
    } catch (error) {
        console.log("Error in getOutgoingFriendRequests controller:", error.message);
        res.status(500).json({
            message: 'Internal Server Error',
        });
    }
}