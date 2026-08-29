import { Router } from 'express';
import { login, register, getProfile } from '../controllers/authController.js';
import { getDestinations, getDestinationById } from '../controllers/destinationController.js';
import { getRecommendations } from '../controllers/recommendationController.js';
import { getAttractions, getAttractionById } from '../controllers/attractionController.js';
import { getRestaurants, getRestaurantById } from '../controllers/restaurantController.js';
import { getNavigationData } from '../controllers/navigationController.js';
import { generateItinerary, saveItinerary, getMyItineraries } from '../controllers/itineraryController.js';
import { bookPackage, getMyBookings, getInvoice } from '../controllers/bookingController.js';
import { validateCoupon } from '../controllers/couponController.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/auth/login', login);
router.post('/auth/register', register);
router.get('/auth/me', requireAuth, getProfile);

router.get('/destinations', rateLimiter(100), getDestinations);
router.get('/destinations/:id', getDestinationById);
router.post('/recommendations', rateLimiter(60), getRecommendations);

router.get('/attractions', rateLimiter(100), getAttractions);
router.get('/attractions/:id', getAttractionById);

router.get('/restaurants', rateLimiter(100), getRestaurants);
router.get('/restaurants/:id', getRestaurantById);

router.get('/navigation/:slug', getNavigationData);

router.post('/itinerary', generateItinerary);
router.post('/itinerary/save', saveItinerary);
router.get('/itinerary/my', getMyItineraries);

router.post('/bookings/package', bookPackage);
router.get('/bookings/my', getMyBookings);
router.get('/bookings/:ref/invoice', getInvoice);

router.post('/coupons/validate', validateCoupon);

export default router;
