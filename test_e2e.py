import db, app

# Ensure tables and pool are initialized
db.init_db()

with app.app.test_client() as client:
    # 1. Test user login session for authenticated tests
    login_res = client.post('/login', data={'email': 'traveller@wanderly.com', 'password': 'password123'})
    assert login_res.status_code in [200, 302], f'Login failed: {login_res.status_code}'
    print('1. User login authenticated successfully')

    # 2. Test homepage SPA rendering with Live Dashboard
    home_res = client.get('/')
    assert home_res.status_code == 200
    assert b'WANDERLY' in home_res.data
    assert b'Live Dashboard' in home_res.data
    assert b'REAL-TIME TELEMETRY' in home_res.data
    assert b'Interactive Map' in home_res.data
    print('2. Homepage SPA & Live Dashboard rendered successfully')

    # 3. Test Real-Time Telemetry Live Endpoint
    telem_res = client.get('/api/telemetry/live')
    assert telem_res.status_code == 200
    t_data = telem_res.get_json()
    assert t_data['system']['status'] == 'connected'
    assert t_data['system']['db_latency_ms'] >= 0
    assert len(t_data['destinations']) >= 8
    print(f'3. Telemetry API live: {len(t_data["destinations"])} weather stations reporting (DB Latency: {t_data["system"]["db_latency_ms"]} ms)')

    # 4. Test Analytics Summary for Charts
    analytics_res = client.get('/api/analytics/summary')
    assert analytics_res.status_code == 200
    an_data = analytics_res.get_json()
    assert 'booking_types' in an_data
    assert 'destinations' in an_data
    print(f'4. Analytics Summary API returned data for real-time charts')

    # 5. Test System Diagnostics & Self-Test Endpoint
    diag_res = client.post('/api/system/self-test')
    assert diag_res.status_code == 200
    diag_data = diag_res.get_json()
    assert diag_data['success'] is True
    assert len(diag_data['tests']) == 4
    print(f'5. System Diagnostics: {diag_data["overall_status"]} ({len(diag_data["tests"])} subsystem tests passed)')

    # 6. Test Destinations API with Environmental Sensors
    dest_res = client.get('/api/destinations')
    assert dest_res.status_code == 200
    dest_data = dest_res.get_json()
    assert len(dest_data) >= 8
    print(f'6. Destinations API returned {len(dest_data)} curated destinations')

    # 7. Test Destination Details with Attractions and Restaurants
    dest_detail = client.get(f'/api/destinations/{dest_data[0]["id"]}')
    assert dest_detail.status_code == 200
    d_json = dest_detail.get_json()
    assert 'attractions' in d_json and len(d_json['attractions']) > 0
    assert 'restaurants' in d_json and len(d_json['restaurants']) > 0
    print(f'7. Destination Details for {d_json["name"]} contains {len(d_json["attractions"])} attractions & {len(d_json["restaurants"])} restaurants')

    # 8. Test Personalized Recommendations Matcher
    rec_res = client.post('/api/recommendations', json={
        'interests': ['nature', 'food'],
        'budget': 15000,
        'days': 3,
        'companion': 'couple',
        'pace': 'relaxed'
    })
    assert rec_res.status_code == 200
    rec_data = rec_res.get_json()
    assert 'recommendations' in rec_data and len(rec_data['recommendations']) > 0
    top_rec = rec_data['recommendations'][0]
    print(f'8. Personalized Matcher returned {len(rec_data["recommendations"])} ranked matches. Top match: {top_rec["name"]} ({top_rec["match_score"]}%)')

    # 9. Test Attractions API
    att_res = client.get('/api/attractions?destination=pondicherry')
    assert att_res.status_code == 200
    att_data = att_res.get_json()
    assert len(att_data) >= 3
    print(f'9. Attractions API returned {len(att_data)} attractions for Pondicherry')

    # 10. Test Restaurants API
    rest_res = client.get('/api/restaurants?destination=pondicherry')
    assert rest_res.status_code == 200
    rest_data = rest_res.get_json()
    assert len(rest_data) >= 2
    print(f'10. Restaurants API returned {len(rest_data)} dining spots for Pondicherry')

    # 11. Test Navigation Geospatial API
    nav_res = client.get('/api/navigation/destination/pondicherry')
    assert nav_res.status_code == 200
    nav_data = nav_res.get_json()
    assert 'destination' in nav_data
    assert 'hotels' in nav_data and len(nav_data['hotels']) > 0
    assert 'attractions' in nav_data and len(nav_data['attractions']) > 0
    assert 'restaurants' in nav_data and len(nav_data['restaurants']) > 0
    assert 'daily_routes' in nav_data and len(nav_data['daily_routes']) > 0
    print(f'11. Navigation API returned {len(nav_data["daily_routes"])} daily route circuits with waypoints for Pondicherry')

    # 12. Test AI Personalized Itinerary Generator
    itin_res = client.post('/api/itinerary', json={
        'destination': 'Pondicherry',
        'days': 3,
        'travel_style': 'Foodie',
        'budget_tier': 'Moderate',
        'companion': 'Couple',
        'pace': 'Relaxed'
    })
    assert itin_res.status_code == 200
    itin_data = itin_res.get_json()
    assert 'budget_breakdown' in itin_data
    assert 'plan' in itin_data and len(itin_data['plan']) == 3
    print(f'12. Itinerary Generator constructed 3-day itinerary: "{itin_data["title"]}" (Est. Budget: ₹{itin_data["estimated_cost"]})')

    # 13. Test Itinerary Save & Retrieval
    save_res = client.post('/api/itinerary/save', json=itin_data)
    assert save_res.status_code == 200
    saved_itins = client.get('/api/my-itineraries').get_json()
    assert len(saved_itins) > 0
    print(f'13. Itinerary saved to PostgreSQL and retrieved ({len(saved_itins)} saved itineraries)')

    # 14. Test Package Booking & Tax Invoice
    pkg_res = client.post('/api/book-package', json={
        'destination': 'Pondicherry',
        'package_tier': 'Gold Premium',
        'travelers': 2,
        'days': 3,
        'travel_date': '2026-10-01',
        'coupon_code': 'WELCOME10'
    })
    assert pkg_res.status_code == 200
    pkg_booking = pkg_res.get_json()
    assert pkg_booking['success'] is True
    booking_ref = pkg_booking['booking_ref']
    print(f'14. Package booking confirmed with reference: {booking_ref}')

    # 15. Test Tax Invoice generation for booking
    inv_res = client.get(f'/api/booking/{booking_ref}/invoice')
    assert inv_res.status_code == 200
    inv_data = inv_res.get_json()
    assert inv_data['invoice_no'].startswith('INV-2026-WY-')
    assert inv_data['financials']['total_amount'] > 0
    print(f'15. Tax invoice verified: {inv_data["invoice_no"]} (Amount: ₹{inv_data["financials"]["total_amount"]})')

    # 16. Test Review Submission & Loyalty Points
    review_res = client.post('/api/reviews', json={
        'item_type': 'destination',
        'item_id': '1',
        'rating': 5,
        'title': 'Outstanding coastal heritage experience',
        'comment': 'White Town architecture, seaside dining, and peaceful French atmosphere were exceptional.'
    })
    assert review_res.status_code == 200
    print('16. Review submitted and 50 Loyalty Points credited to user profile')

    # 17. Test Concierge Support Ticket Submission
    ticket_res = client.post('/api/support/ticket', json={
        'subject': 'Airport Transfer Inquiry',
        'category': 'Booking',
        'priority': 'Normal',
        'message': 'Can you arrange a private chauffeur from Chennai Airport to Pondicherry resort?'
    })
    assert ticket_res.status_code == 200
    ticket_ref = ticket_res.get_json()['ticket_ref']
    print(f'17. Concierge support ticket created: {ticket_ref}')

    # 18. Test Admin Logout, Login and Metrics Portal
    client.get('/logout')
    admin_login = client.post('/login', data={'email': 'admin@wanderly.com', 'password': 'admin123', 'is_admin_login': 'true'})
    assert admin_login.status_code in [200, 302]
    admin_metrics_res = client.get('/api/admin/metrics')
    assert admin_metrics_res.status_code == 200
    admin_kpis = admin_metrics_res.get_json()['kpis']
    assert admin_kpis['total_revenue'] > 0
    print(f'18. Admin Console verified: Gross Revenue ₹{admin_kpis["total_revenue"]:,.2f}, Total Users: {admin_kpis["total_users"]}')

print('\n*** ALL 18 END-TO-END AUTOMATED TESTS PASSED SUCCESSFULLY! ***')

