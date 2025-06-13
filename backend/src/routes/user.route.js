import express from 'express';
import { protectRoute } from '../middleware/auth.middleware';
import { getRecommendedUsers, getMyFriends } from '../controllers/user.controller.js';

const router = express.Router();

//applu auth middleware to all the routes
router.use(protectRoute); 

router.get("/", getRecommendedUsers);
router.get("/friends", getMyFriends);

router.post("/friend-request/:id", sendFriendRequest);
router.put("/friend-request/:id/accept", acceptFriendRequest);

router.get("/friend-request", getFriendRequests);
router.get("outgoing-friend-requests", getOutgoingFriendRequests);

export default router;
