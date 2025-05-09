import User from "../models/User.js";
import Listing from "../models/Listing.js"

import { MAX_USER_LISTINGS_PER_PAGE } from "../config/config.js";

export const updateUser = async (req, res) => {
    try {
      const userId = req.params.id; 
      const updates = req.body; 
      
      // Remove any fields that are undefined (not provided in the request)
      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );

      console.log('filteredUpdates', filteredUpdates)
  
      // Use findByIdAndUpdate with $set to update only specified fields
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: filteredUpdates },
        { new: true }  // Option to return the updated document
      );
  
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      res.status(200).json({ user: updatedUser });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update user profile', error });
    }
};

export const updateInterestedListings = async (req, res) => {
    try {
        const { id } = req.params;  // User ID
        const { action, listingId } = req.body; // Expect action: "add" or "remove"

        if (!listingId) {
            return res.status(400).json({ message: "Missing listingId" });
        }

        let updateQuery = {};

        if (action === "add") {
            updateQuery = { $addToSet: { interestedListings: listingId } }; // Prevent duplicates
        } else if (action === "remove") {
            updateQuery = { $pull: { interestedListings: listingId } }; // Remove from array
        } else {
            return res.status(400).json({ message: "Invalid action" });
        }

        const updatedUser = await User.findByIdAndUpdate(
            id,
            updateQuery,
            { new: true } // Return updated document
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: "Failed to update interestedListings", error });
    }
};
  
export const getUserById = async (req, res) => {
    const { id } = req.params;

    try {
        const user = await User.findById(id)
            .populate('listings interestedListings contacts') // Populate references
            .select('-password'); // Exclude the password field for security

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving user', error: error.message });
    }
};

export const getUserByIdPaginated = async (req, res) => {
    const { id } = req.params;
    let { activePage = 1, interestedPage = 1, inactivePage = 1} = req.query;
    activePage = parseInt(activePage);
    interestedPage = parseInt(interestedPage);
    inactivePage = parseInt(inactivePage)

    try {
        const user = await User.findById(id)
            .select("fullName username email bio interestedListings profilePicture") 
            .lean(); // Convert Mongoose object to JSON

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Fetch paginated active listings
        const [activeListings, totalActiveListings] = await Promise.all([
            Listing.find({ seller: id, status: "available" })
                .sort({ createdAt: -1 }) 
                .skip((activePage-1) * MAX_USER_LISTINGS_PER_PAGE)
                .limit(MAX_USER_LISTINGS_PER_PAGE)
                .select("title price image category createdAt"),
            Listing.countDocuments({ seller: id, status: "available" })
        ]);

        // Fetch paginated interested listings
        const [interestedListings, totalInterestedListings] = await Promise.all([
            Listing.find({ _id: { $in: user.interestedListings } })
                .sort({ createdAt: -1 }) 
                .skip((interestedPage-1) * MAX_USER_LISTINGS_PER_PAGE)
                .limit(MAX_USER_LISTINGS_PER_PAGE)
                .select("title price image category createdAt"),
            Listing.countDocuments({ _id: { $in: user.interestedListings } })
        ]);

         // Fetch paginated inactive listings
         const [inactiveListings, totalInactiveListings] = await Promise.all([
            Listing.find({ seller: id, status: { $ne: "available" } }) // Exclude active listings
                .sort({ createdAt: -1 })
                .skip((inactivePage - 1) * MAX_USER_LISTINGS_PER_PAGE)
                .limit(MAX_USER_LISTINGS_PER_PAGE)
                .select("title price image category createdAt status"),
            Listing.countDocuments({ seller: id, status: { $ne: "available" } })
        ]);

        res.status(200).json({
            ...user, // Include user details
            activeListings,
            totalActiveListingsPages: Math.ceil(totalActiveListings / MAX_USER_LISTINGS_PER_PAGE),
            interestedListings,
            totalInterestedListingsPages: Math.ceil(totalInterestedListings / MAX_USER_LISTINGS_PER_PAGE),
            inactiveListings,
            totalInactiveListings: Math.ceil(totalInactiveListings / MAX_USER_LISTINGS_PER_PAGE )
        });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving user', error: error.message });
    }
};

export const getUserByEmail = async (req, res) => {
  const email  = req.params.email;

  try {
      
      const user = await User.find({ email: email })
          .populate('listings interestedListings') // Populate references
          .select('-password'); // Exclude the password field for security
     console.log("is this being hit?")
      console.log(user)
      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }

      res.status(200).json({user: user});
  } catch (error) {
      res.status(500).json({ message: 'Error retrieving user', error: error.message });
  }
};

export const addInterestedListing = async (req, res) => {
  try {
      const { userId, listingId } = req.body; // Expect userId and listingId in request body

      if (!userId || !listingId) {
          return res.status(400).json({ message: "User ID and Listing ID are required." });
      }

      // Update the user's interestedListings array
      const updatedUser = await User.findByIdAndUpdate(
          userId,
          { $addToSet: { interestedListings: listingId } }, // $addToSet prevents duplicates
          { new: true } // Return updated document
      );

      if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json({ message: "Listing added to interestedListings" });
  } catch (error) {
      res.status(500).json({ message: "Failed to add interested listing", error });
  }
};

export const removeInterestedListing = async (req, res) => {
  try {
      const { userId, listingId } = req.body;

      if (!userId || !listingId) {
          return res.status(400).json({ message: "User ID and Listing ID are required." });
      }

      const updatedUser = await User.findByIdAndUpdate(
          userId,
          { $pull: { interestedListings: listingId } }, // $pull removes matching value
          { new: true }
      );

      if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json({ message: "Listing removed from interestedListings" });
  } catch (error) {
      res.status(500).json({ message: "Failed to remove interested listing", error });
  }
};

export const getUserListings = async (req, res) => {
  try {
      const { id } = req.params;

      // Find the user and return only the listings array, populating the listing details
      const user = await User.findById(id).populate('listings', '-__v'); // Exclude __v (version) field

      if (!user) {
          return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json({ listings: user.listings });
  } catch (error) {
      res.status(500).json({ message: "Failed to retrieve user listings", error });
  }
};

export const getUserInterestedListings = async (req, res) => {
  try {
      const { id } = req.params;

      // Find the user and return only the interestedListings array, populating listing details
      const user = await User.findById(id).populate('interestedListings', '-__v');

      if (!user) {
          return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json({ interestedListings: user.interestedListings });
  } catch (error) {
      res.status(500).json({ message: "Failed to retrieve user's interested listings", error });
  }
};

export const getUserInactiveListings = async (req, res) => {
    try {
        const { id } = req.params;
  
        // Find the user and return only the inactiveListings array, populating listing details
        const user = await User.findById(id).populate('inactiveListings', '-__v');
  
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
  
        res.status(200).json({ inactiveListings: user.inactiveListings });
    } catch (error) {
        res.status(500).json({ message: "Failed to retrieve user's inactive listings", error });
    }
};

export const addInactiveListing = async (req, res) => {
    try {
        const { sellerId, listingId } = req.body; // Expect userId and listingId in request body
  
        if (!sellerId || !listingId) {
            return res.status(400).json({ message: "User ID and Listing ID are required." });
        }
  
        // Update the user's inactiveListings array
        const updatedUser = await User.findByIdAndUpdate(
            sellerId,
            { $addToSet: { inactiveListings: listingId } }, // $addToSet prevents duplicates
            { new: true } // Return updated document
        );
  
        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }
  
        res.status(200).json({ message: "Listing added to inactiveListings" });
    } catch (error) {
        res.status(500).json({ message: "Failed to add inactive listing", error });
    }
};

export const removeInactiveListing = async (req, res) => {
    try {
        const { sellerId, listingId } = req.body;
  
        if (!sellerId || !listingId) {
            return res.status(400).json({ message: "User ID and Listing ID are required." });
        }
  
        const updatedUser = await User.findByIdAndUpdate(
            sellerId,
            { $pull: { inactiveListings: listingId } }, // $pull removes matching value
            { new: true }
        );
  
        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }
  
        res.status(200).json({ message: "Listing removed from inactiveListings" });
    } catch (error) {
        res.status(500).json({ message: "Failed to remove inactive listing", error });
    }
};

export const addActiveListing = async (req, res) => {
    try {
        const { sellerId, listingId } = req.body; // Expect userId and listingId in request body
  
        if (!sellerId || !listingId) {
            return res.status(400).json({ message: "User ID and Listing ID are required." });
        }
  
        // Update the user's inactiveListings array
        const updatedUser = await User.findByIdAndUpdate(
            sellerId,
            { $addToSet: { listings: listingId } }, // $addToSet prevents duplicates
            { new: true } // Return updated document
        );
  
        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }
  
        res.status(200).json({ message: "Listing added to listings" });
    } catch (error) {
        res.status(500).json({ message: "Failed to add listing", error });
    }
};

export const removeActiveListing = async (req, res) => {
    try {
        const { sellerId, listingId } = req.body;
  
        if (!sellerId || !listingId) {
            return res.status(400).json({ message: "User ID and Listing ID are required." });
        }
  
        const updatedUser = await User.findByIdAndUpdate(
            sellerId,
            { $pull: { listings: listingId } }, // $pull removes matching value
            { new: true }
        );
  
        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }
  
        res.status(200).json({ message: "Listing removed from listings" });
    } catch (error) {
        res.status(500).json({ message: "Failed to remove listing", error });
    }
};

export const addContact = async (req, res) => {
    const { user1Id, user2Id } = req.body;

    if (user1Id === user2Id) {
        return res.status(400).json({ message: "You cannot message yourself" });
    }

    try {
        await Promise.all([
            User.findByIdAndUpdate(user1Id, { $addToSet: { contacts: user2Id } }),
            User.findByIdAndUpdate(user2Id, { $addToSet: { contacts: user1Id } })
        ]);
        
        const user1 = await User.findById(user1Id);
        const user2 = await User.findById(user2Id);
        console.log('user1: ' + user1.fullName);
        console.log('user2: ' + user2.fullName);
        console.log('contacts: ' + user1.contacts);
        return res.status(200).json({ message: "Contact added successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to add contact", error });
    }
};