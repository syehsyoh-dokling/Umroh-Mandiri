# DB Domain Mapping — Umroh Platform

## 1. User & Auth
- users
- login_logs
- register_logs
- reset_password_tokens
- referrals

## 2. Flight & Ticketing (CORE ENGINE)
- airlines
- ref_airlines
- ref_airports
- flight_legs_plan
- flight_price_plan
- raw_fetch_session
- raw_flight_legs
- tiket_pp_harian
- tiket_pp_cache
- tiket_raw_segments
- route_catalog
- route_scenarios

## 3. Umroh & Travel
- jadwal_umroh
- jadwal_keberangkatan
- travel_umroh
- travel_jemput

## 4. Hotel
- hotel_umroh
- hotel_umroh_new
- hotel_umroh_backup
- hotel_cache
- hotel_beds_cache

## 5. Transport
- transport_routes
- transport_stations
- transport_vehicles
- transport_rates
- transport_transactions
- transport_bookings
- transport_hotels
- transport_station_routes
- transport_station_hotels

## 6. Konten & CMS
- konten
- konten_persiapan
- narasi_konten
- menus
- faq
- faq_questions
- faq_pages
- faq_question_pages
- faq_stats

## 7. Interaksi & GPT
- gpt_pertanyaan
- log_pertanyaan_keberangkatan
- talk_rooms
- talk_messages
- talk_members
- talk_translations

## 8. Lokasi & Wilayah
- provinces
- cities
- districts
- subdistricts
- villages

## 9. Haram Tools (Masjidil Haram Utility)
- haram_gate
- haram_gate_usage
- haram_toilet
- haram_vertical_access
- haram_category
- haram_clinic

## 10. Finance & Supporting
- pembiayaan_syariah
- voucher
- voucher_item
- zamzam_rates_flat_set
- zamzam_transactions

## 11. Logs & System
- log_aktivitas
- airline_fetch_logs
- job_state
- app_settings

## 12. Views (Read Only)
- v_haram_gate_masjid
- v_haram_gate_mataf
- v_haram_gate_usage
- v_travel_promos
- v_travel_promos_store
- vw_airlines_latest_promo

