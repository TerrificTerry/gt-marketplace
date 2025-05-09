import express from 'express'
import { addListing, updateListing, getListingById, getActiveListings, getListingsBySeller, deleteListing, getFilteredListings, deleteListingPaginated, getListingEmbedding} from '../controllers/listingController.js'

const router = express.Router();

router.post('/filter', getFilteredListings)
// get all listings (this needs to be above the get request for '/:id' so that 'active' does not get confused as id)
router.get('/active', getActiveListings);

router.post('/embedding', getListingEmbedding);

// add new Listing
router.post('/:id', addListing) //id specifies the user id 

// update a listing
router.patch('/:id', updateListing)

// get a specific listing based on its id
router.get('/:id', getListingById)

// get all listings by seller id
router.get('/seller/:id', getListingsBySeller)

// delete listing by id
router.delete('/:id', deleteListing);

router.delete('/:id/paginated', deleteListingPaginated);

export default router;