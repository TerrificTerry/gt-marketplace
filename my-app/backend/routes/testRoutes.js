import express from 'express'
import {addUser, addListing, deleteUsersandListings, updateUser, updateListing} from '../controllers/testAPI.controllers.js'

const router = express.Router();

// add new user
router.post('/addUser', addUser)
// add new Listing
router.post('/addListing/:id', addListing) //id specifies the user id

router.delete('/delete', deleteUsersandListings) // either delete all or delete a specific listing
                                                 // or user by specifying the id fields in the req.body           
router.put('/updateUser/:id', updateUser)
router.put('/updateListing/:id', updateListing)

export default router;

