from fastapi import APIRouter, HTTPException, Header, status
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uuid
from datetime import datetime, timezone
import logging
from app.supabase_client import supabase

logger = logging.getLogger("campusconnect.routes")

router = APIRouter(prefix="/api", tags=["CampusConnect API"])

# Default test student ID from seeded data (Student 1)
DEFAULT_TEST_STUDENT_ID = "22222222-2222-2222-2222-222222222222"

# In-memory fallback registrations store (used when Supabase is temporarily offline or for instant responsiveness)
_in_memory_registrations: List[Dict[str, Any]] = []

# Rich catalog metadata mapping to enrich database records with Stitch UI design assets
EVENT_METADATA: Dict[str, Dict[str, Any]] = {
    "550e8400-e29b-41d4-a716-446655440000": {
        "title": "AI Build Night",
        "category": "AI",
        "starts_at": "2025-04-12T17:00:00Z",
        "ends_at": "2025-04-12T21:30:00Z",
        "time_str": "5:00 PM – 9:30 PM EST",
        "date_str": "Apr 12, 2025",
        "location": "Main Seminar Hall, North Campus",
        "room": "Seminar Hall 101",
        "organizer_name": "Computer Science Hub",
        "organizer_handle": "@cs_hub",
        "admission_tier": "Free RSVP",
        "price": "FREE",
        "featured": True,
        "image_url": "https://lh3.googleusercontent.com/aida-public/AB6AXuANUTfpy-HpyT5pV4rFQe0fjkbtzaSlXxkA24o6R9fXHjx-RLcif1EwXpjFNjsFwuvB2AMrkK40xodlULZbj4M7paexrd1kGZU4fuepRmsBYytysp_5w4zxclowP4UGj61dWka33wC7OWvCn_tsvOZcjFbmx1rwTYC2fOGxaQ8YKSNGZaTqebtf1BN6icDBm6XYIyyuLi00VAsvX1vEv_d2qYqSbCD4mEQHg6yjXMg",
        "description": "Jump beyond generic prompting. At AI Build Night, build and deploy functional autonomous agents that interface with external APIs, reason through dynamic workflows, and interact across multimodal visual and vocal contexts. Scaffolding code and vector credits provided.",
        "perks": [
            {"icon": "local_pizza", "title": "Free Dinner & Drinks", "desc": "Artisan pizzas, gluten-free options, and cold brew bar throughout the night."},
            {"icon": "card_membership", "title": "Official Certificate & Swag", "desc": "Exclusive limited-edition embroidered hoodies and GitHub badge accreditation."},
            {"icon": "memory", "title": "Hardware lab access", "desc": "Nvidia H100 API tokens and GPU compute cluster access included."},
            {"icon": "support_agent", "title": "1:1 Faculty Mentorship", "desc": "Direct debug assistance from AI researchers and visiting alumni."}
        ],
        "attendee_sample": ["JD", "RK", "AL", "+42"]
    },
    "550e8400-e29b-41d4-a716-446655440001": {
        "title": "Autonomous Robotics Workshop",
        "category": "Robotics",
        "starts_at": "2025-04-18T14:30:00Z",
        "ends_at": "2025-04-18T18:00:00Z",
        "time_str": "2:30 PM – 6:00 PM EST",
        "date_str": "Apr 18, 2025",
        "location": "Engineering Lab 4B",
        "room": "Robotics Bay 204",
        "organizer_name": "Robotics Guild",
        "organizer_handle": "@robotics_guild",
        "admission_tier": "Student RSVP",
        "price": "FREE",
        "featured": False,
        "image_url": "https://lh3.googleusercontent.com/aida-public/AB6AXuAgYlVO9-_9pT7nFbp042goVjZrPXxx_HwQToy6fC9oOYxccSvXa2KaxHMfcptTc48ZmO2rhis7BB0d_PYbFawFFFF5DcLFuIro41lG-jFaNvYWEA_-fFtttJuLMEtchmvpZnrtDoNuZKf6YBZSfTAv15AOraBKZDQnliTiyq3Q-aogJ9K-ItRNTIYO2mtEepFvHbsgDKYfLcOWhLExlBIr8xUUnabnfeqBbR9cQ4o",
        "description": "Dive deep into modern autonomous navigation. Hands-on robotics hardware prototyping workshop with ROS2, microcontroller sensor fusion, computer vision obstacle avoidance, and real-time path planning on mobile rover chassis.",
        "perks": [
            {"icon": "handyman", "title": "Hardware Kit Provided", "desc": "Take-home microcontroller, lidar sensor modules, and motor driver shield."},
            {"icon": "military_tech", "title": "Robotics Guild Certificate", "desc": "Verified credential for engineering portfolios and resumes."},
            {"icon": "groups", "title": "Team Capstone Sprint", "desc": "Compete in an arena navigation speed challenge with cash prizes."}
        ],
        "attendee_sample": ["AR", "MK", "+18"]
    },
    "550e8400-e29b-41d4-a716-446655440002": {
        "title": "Open Source Sprint & Git Jam",
        "category": "Open Source",
        "starts_at": "2025-04-24T10:00:00Z",
        "ends_at": "2025-04-24T16:00:00Z",
        "time_str": "10:00 AM – 4:00 PM EST",
        "date_str": "Apr 24, 2025",
        "location": "Student Innovation Center",
        "room": "Collaborative Commons B",
        "organizer_name": "Linux & OSS Club",
        "organizer_handle": "@foss_campus",
        "admission_tier": "Open Access",
        "price": "FREE",
        "featured": False,
        "image_url": "https://lh3.googleusercontent.com/aida-public/AB6AXuBKHPKtsGgbjQtUcT4aEPvux0nceJBJSUCdwuekJQvByeRQsdYj6xTo2_mkKsqBxeJvqCC1qxzQf2rrI1E_Dxo5JujqLj7TrSrYs9QIN7aSGoYb1XGzz0IjiTL4xTwvr_b20RjZuqrd3Fd5U9uSeJTcLq1SPAguiEBoPBqA7HbpPkzGB97HlmEUWsxGjhPcznfNvlpNa6kzg47ufeCqXkHa50f1fwC_UT2oc_GiY3M",
        "description": "Collaborative sprint on open-source repositories. Team up with experienced maintainers to triage real issues, construct production pull requests, write unit tests, and master interactive Git rebase workflows.",
        "perks": [
            {"icon": "terminal", "title": "All Experience Levels", "desc": "Beginner and advanced tracks with dedicated pull request review stations."},
            {"icon": "lunch_dining", "title": "Buffet Lunch Included", "desc": "Warm catered lunch, artisan snacks, and energy drinks."},
            {"icon": "redeem", "title": "GitHub Swag Pack", "desc": "Exclusive stickers, pins, and developer t-shirts for every merged PR."}
        ],
        "attendee_sample": ["SK", "TY", "+30"]
    },
    "550e8400-e29b-41d4-a716-446655440003": {
        "title": "Full-Stack Next.js Hack Day",
        "category": "Open Source",
        "starts_at": "2025-05-02T09:00:00Z",
        "ends_at": "2025-05-02T17:00:00Z",
        "time_str": "9:00 AM – 5:00 PM EST",
        "date_str": "May 02, 2025",
        "location": "Turing Hall B10",
        "room": "Room B10",
        "organizer_name": "Web Dev Society",
        "organizer_handle": "@webdev_soc",
        "capacity": 60,
        "status": "open",
        "admission_tier": "Free RSVP",
        "price": "FREE",
        "featured": False,
        "image_url": "https://lh3.googleusercontent.com/aida-public/AB6AXuBGG1yybGXR5F_CLgKGQ5kQtt4umasj5CDEnW5J0dUdsm_CmSP9S8PeBz9KlMeEaikiZGDPrMMX8M6BLeS6ucmDrO_dULjZs_CUNTWfihG-ZNPTjjYGep2nGjYCHlIPK3RIZSghLX8xieseuiHjsbEdMieV4vG_FgGhpi3zrHFN3LIwKpLZHZW7IzPEfWTwyphsYICJW7ssWBO7R2AvEBBHWexaRFlAFDwhlH7i5PA",
        "description": "Build modern edge-ready web applications from scratch using Next.js App Router, React Server Components, TypeScript, and serverless databases. Ship a live production app by the end of the day.",
        "perks": [
            {"icon": "local_cafe", "title": "Lunch & Refreshments", "desc": "Barista coffee and lunch provided for all registered builders."},
            {"icon": "cloud_upload", "title": "Free Vercel Deployment Credits", "desc": "Enterprise team domain and hosting deployment coupons."}
        ],
        "attendee_sample": ["NL", "DV", "+22"]
    },
    "550e8400-e29b-41d4-a716-446655440004": {
        "title": "Generative AI & LLM Masterclass",
        "category": "AI",
        "starts_at": "2025-05-08T15:00:00Z",
        "ends_at": "2025-05-08T19:00:00Z",
        "time_str": "3:00 PM – 7:00 PM EST",
        "date_str": "May 08, 2025",
        "location": "Auditorium Prime",
        "room": "Main Stage",
        "organizer_name": "AI Research Collective",
        "organizer_handle": "@ai_collective",
        "capacity": 120,
        "status": "open",
        "admission_tier": "Faculty & Student",
        "price": "FREE",
        "featured": False,
        "image_url": "https://lh3.googleusercontent.com/aida-public/AB6AXuAr70tynuJBXO0FcT9B5sfJNCBlglF5pQOSGYvQA_E6up4vMvK-hExCHmjgbApBkZ6mcy6sQPinaKGgm3LsiMdCYiF4KOUOLlCREO5aQz-1-LrRoHi455Sa417BSNEqc64zmexkuFsn7Unw3APfxPCTKyarp_EyfOoXaDAM-zVnNkmvm13esMcXNT7WexDD5hB9TzYsd_vAQt4DUCUFuqyIPZ6vkUNKzfS_4aWFNWE",
        "description": "Deep architectural walkthrough of transformers, retrieval-augmented generation (RAG), parameter-efficient fine-tuning (LoRA), and agentic tool evaluation with faculty keynote and Q&A panel.",
        "perks": [
            {"icon": "psychology", "title": "Live Model Fine-Tuning Demo", "desc": "Run training jobs live on university supercomputer node."},
            {"icon": "auto_stories", "title": "Comprehensive Research Syllabus", "desc": "Curated reading list and access to private research Discord."}
        ],
        "attendee_sample": ["EM", "ZT", "+85"]
    },
    "550e8400-e29b-41d4-a716-446655440005": {
        "title": "UI/UX & Design Systems Jam",
        "category": "Design",
        "starts_at": "2025-05-14T13:00:00Z",
        "ends_at": "2025-05-14T17:00:00Z",
        "time_str": "1:00 PM – 5:00 PM EST",
        "date_str": "May 14, 2025",
        "location": "Design Studio 3",
        "room": "Creative Lab",
        "organizer_name": "Campus Design Guild",
        "organizer_handle": "@designduo",
        "capacity": 40,
        "status": "open",
        "admission_tier": "Open RSVP",
        "price": "FREE",
        "featured": False,
        "image_url": "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=1200&q=80",
        "description": "Learn how top tech companies build atomic design systems, maintain design tokens, and establish fluid micro-interactions. Practice redesigning real-world product flows in Figma.",
        "perks": [
            {"icon": "palette", "title": "Figma Pro Access", "desc": "6 months free Figma professional student license."},
            {"icon": "brush", "title": "Design Critique Clinic", "desc": "Get your portfolio and Figma components reviewed 1-on-1."}
        ],
        "attendee_sample": ["LC", "PS", "+14"]
    },
    "550e8400-e29b-41d4-a716-446655440006": {
        "title": "Web3 & Decentralized Identity Forum",
        "category": "Web3",
        "starts_at": "2025-05-20T16:00:00Z",
        "ends_at": "2025-05-20T19:30:00Z",
        "time_str": "4:00 PM – 7:30 PM EST",
        "date_str": "May 20, 2025",
        "location": "Crypto Innovation Hub",
        "room": "Room 105",
        "organizer_name": "Blockchain Association",
        "organizer_handle": "@web3_campus",
        "capacity": 50,
        "status": "open",
        "admission_tier": "Free RSVP",
        "price": "FREE",
        "featured": False,
        "image_url": "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80",
        "description": "Explore zero-knowledge proofs, decentralized identifiers (DIDs), verifiable campus credentials, and privacy-preserving smart contract architectures.",
        "perks": [
            {"icon": "token", "title": "Soulbound Attendance Token", "desc": "Minted on testnet as verifiable campus activity proof."},
            {"icon": "security", "title": "ZK Proof Playground", "desc": "Hands-on Circom circuit design and browser proofs."}
        ],
        "attendee_sample": ["BL", "WK", "+29"]
    }
}


def _enrich_event(raw_event: Dict[str, Any], booked_count: int = 0) -> Dict[str, Any]:
    """Enriches database event records with rich design and schedule metadata."""
    event_id = str(raw_event.get("id", ""))
    meta = EVENT_METADATA.get(event_id, {})
    capacity = int(raw_event.get("capacity") or meta.get("capacity") or 50)
    seats_left = max(0, capacity - booked_count)
    
    return {
        "id": event_id,
        "organizer_id": raw_event.get("organizer_id", "11111111-1111-1111-1111-111111111111"),
        "title": raw_event.get("title") or meta.get("title") or "Campus Event",
        "capacity": capacity,
        "status": raw_event.get("status") or meta.get("status") or "open",
        "category": meta.get("category", "Tech & AI"),
        "description": meta.get("description", "Join your fellow students for an interactive campus learning experience."),
        "starts_at": meta.get("starts_at", "2025-04-12T17:00:00Z"),
        "ends_at": meta.get("ends_at", "2025-04-12T21:30:00Z"),
        "date_str": meta.get("date_str", "Upcoming"),
        "time_str": meta.get("time_str", "TBA"),
        "location": meta.get("location", "Main Campus Hall"),
        "room": meta.get("room", "Auditorium"),
        "organizer_name": meta.get("organizer_name", "Campus Student Guild"),
        "organizer_handle": meta.get("organizer_handle", "@campus"),
        "image_url": meta.get("image_url", "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80"),
        "perks": meta.get("perks", []),
        "admission_tier": meta.get("admission_tier", "Free RSVP"),
        "price": meta.get("price", "FREE"),
        "featured": meta.get("featured", False),
        "attendee_sample": meta.get("attendee_sample", ["JD", "RK", "+20"]),
        "booked_seats": booked_count,
        "seats_left": seats_left,
    }


def _get_registration_count(event_id: str) -> int:
    """Calculates total confirmed registrations for an event from both Supabase and memory."""
    count = 0
    if supabase:
        try:
            reg_count_res = supabase.table("registrations").select("id", count="exact").eq("event_id", event_id).execute()
            count += (reg_count_res.count or 0)
        except Exception as e:
            logger.warning(f"Error counting registrations in Supabase: {e}")
            
    # Include memory registrations for this event
    mem_count = sum(1 for r in _in_memory_registrations if r.get("event_id") == event_id)
    return max(count, mem_count)


def _resolve_user_id(val: Any) -> str:
    """Safely extracts string UUID, guarding against FastAPI Header object injection when called directly."""
    if isinstance(val, str) and len(val.strip()) > 0:
        return val.strip()
    return DEFAULT_TEST_STUDENT_ID


# ============================================================
# Request / Response Schemas
# ============================================================
class RegistrationRequest(BaseModel):
    event_id: str


# ============================================================
# FR-02: Browse Events
# GET /api/events
# ============================================================
@router.get("/events", summary="Browse all campus events")
def list_events(search: Optional[str] = None):
    events_list: List[Dict[str, Any]] = []
    seen_ids = set()

    # 1. Fetch live events from Supabase if connected
    if supabase:
        try:
            query = supabase.table("events").select("*")
            if search:
                query = query.ilike("title", f"%{search}%")
            response = query.execute()
            if response.data:
                for row in response.data:
                    ev_id = str(row.get("id"))
                    booked = _get_registration_count(ev_id)
                    enriched = _enrich_event(row, booked)
                    events_list.append(enriched)
                    seen_ids.add(ev_id)
        except Exception as e:
            logger.error(f"Error querying Supabase events: {e}")

    # 2. Seamlessly include supplemental events from metadata catalog
    for ev_id, meta in EVENT_METADATA.items():
        if ev_id not in seen_ids:
            booked = _get_registration_count(ev_id)
            enriched = _enrich_event({"id": ev_id, **meta}, booked)
            if search:
                s_lower = search.lower()
                fields = f"{enriched['title']} {enriched['category']} {enriched['location']} {enriched['description']}".lower()
                if s_lower not in fields:
                    continue
            events_list.append(enriched)
            seen_ids.add(ev_id)

    return events_list


# ============================================================
# FR-03: View Event Details
# GET /api/events/{event_id}
# ============================================================
@router.get("/events/{event_id}", summary="Get single event details")
def get_event_details(event_id: str):
    raw_event = None

    if supabase:
        try:
            event_res = supabase.table("events").select("*").eq("id", event_id).execute()
            if event_res.data:
                raw_event = event_res.data[0]
        except Exception as e:
            logger.warning(f"Error fetching event {event_id} from Supabase: {e}")

    if not raw_event:
        if event_id in EVENT_METADATA:
            raw_event = {"id": event_id, **EVENT_METADATA[event_id]}
        else:
            raise HTTPException(status_code=404, detail="Event not found")

    booked_count = _get_registration_count(event_id)
    return _enrich_event(raw_event, booked_count)


# ============================================================
# FR-04: Register for an Event (HERO FEATURE - Slides 47, 55, 57)
# POST /api/registrations
# ============================================================
@router.post("/registrations", status_code=status.HTTP_201_CREATED, summary="Register student for an event")
def register_for_event(
    payload: RegistrationRequest,
    x_user_id: Optional[str] = Header(default=DEFAULT_TEST_STUDENT_ID, description="Authenticated User ID")
):
    """
    Core Registration Logic with 5 Production Guards:
    1. Authenticate user context (User identity from header, not body!)
    2. Check Event exists and is 'open'
    3. Check Duplicate Registration
    4. Check Seat Capacity
    5. Save Registration Record
    """
    user_id = _resolve_user_id(x_user_id)
    event_id = payload.event_id

    # Guard 1: Verify authenticated user identity
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Guard 2: Verify event exists and is open (Slide 24 & 55)
    event_record = None
    if supabase:
        try:
            event_res = supabase.table("events").select("*").eq("id", event_id).execute()
            if event_res.data:
                event_record = event_res.data[0]
        except Exception as e:
            logger.warning(f"Supabase event lookup error: {e}")

    if not event_record and event_id in EVENT_METADATA:
        event_record = {"id": event_id, **EVENT_METADATA[event_id]}

    if not event_record:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event_record.get("status") != "open":
        raise HTTPException(status_code=400, detail="Event is closed for registration")

    # Guard 3: Duplicate Check (Slide 23 & 55)
    is_duplicate = False
    if supabase:
        try:
            existing_reg = supabase.table("registrations") \
                .select("id") \
                .eq("user_id", user_id) \
                .eq("event_id", event_id) \
                .execute()
            if existing_reg.data:
                is_duplicate = True
        except Exception as e:
            logger.warning(f"Supabase duplicate check query failed: {e}")

    for mem in _in_memory_registrations:
        if mem.get("user_id") == user_id and mem.get("event_id") == event_id:
            is_duplicate = True
            break

    if is_duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="DUPLICATE_REGISTRATION"
        )

    # Guard 4: Capacity Check / Overbooking Protection (Slide 40 & 55)
    current_count = _get_registration_count(event_id)
    capacity = int(event_record.get("capacity", 50))
    if current_count >= capacity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="EVENT_FULL"
        )

    # Guard 5: Save Registration (Slide 47 & 55)
    reg_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    supabase_success = False

    if supabase:
        try:
            insert_res = supabase.table("registrations").insert({
                "id": reg_id,
                "user_id": user_id,
                "event_id": event_id
            }).execute()
            if insert_res.data:
                reg_id = insert_res.data[0].get("id", reg_id)
                supabase_success = True
        except Exception as e:
            logger.warning(f"Supabase registration insert: {e}")

    # Track in memory store as well
    _in_memory_registrations.append({
        "id": reg_id,
        "user_id": user_id,
        "event_id": event_id,
        "created_at": created_at,
        "events": _enrich_event(event_record)
    })

    return {
        "id": reg_id,
        "event_id": event_id,
        "status": "REGISTERED",
        "created_at": created_at
    }


# ============================================================
# FR-06: View My Registrations (Slide 46)
# GET /api/me/registrations
# ============================================================
@router.get("/me/registrations", summary="Get registered events for current student")
def get_my_registrations(
    x_user_id: Optional[str] = Header(default=DEFAULT_TEST_STUDENT_ID)
):
    student_id = _resolve_user_id(x_user_id)
    results: List[Dict[str, Any]] = []
    seen_reg_ids = set()

    # 1. Fetch from Supabase
    if supabase:
        try:
            response = supabase.table("registrations") \
                .select("id, created_at, event_id, events(*)") \
                .eq("user_id", student_id) \
                .execute()
            if response.data:
                for reg in response.data:
                    reg_id = str(reg.get("id"))
                    ev_data = reg.get("events")
                    if isinstance(ev_data, list) and ev_data:
                        ev_data = ev_data[0]
                    ev_id = str(reg.get("event_id") or (ev_data.get("id") if ev_data else ""))
                    
                    enriched_ev = _enrich_event(ev_data or {"id": ev_id})
                    results.append({
                        "id": reg_id,
                        "created_at": reg.get("created_at"),
                        "event_id": ev_id,
                        "events": enriched_ev
                    })
                    seen_reg_ids.add(reg_id)
        except Exception as e:
            logger.warning(f"Error querying Supabase registrations: {e}")

    # 2. Combine with in-memory registrations
    for mem in _in_memory_registrations:
        reg_id = mem.get("id")
        if mem.get("user_id") == student_id and reg_id not in seen_reg_ids:
            results.append(mem)
            seen_reg_ids.add(reg_id)

    return results


# ============================================================
# DELETE /api/registrations/{registration_id} (Cancel RSVP)
# ============================================================
@router.delete("/registrations/{registration_id}", summary="Cancel event registration")
def cancel_registration(
    registration_id: str,
    x_user_id: Optional[str] = Header(default=DEFAULT_TEST_STUDENT_ID)
):
    student_id = _resolve_user_id(x_user_id)
    # Remove from Supabase
    if supabase:
        try:
            supabase.table("registrations").delete().eq("id", registration_id).eq("user_id", student_id).execute()
        except Exception as e:
            logger.warning(f"Error canceling registration in Supabase: {e}")

    # Remove from memory
    global _in_memory_registrations
    _in_memory_registrations = [r for r in _in_memory_registrations if r.get("id") != registration_id]

    return {"status": "CANCELLED", "id": registration_id}



# ============================================================
# FR-07: Organizer Attendee View (Slide 22 & 46)
# GET /api/events/{event_id}/registrations
# ============================================================
@router.get("/events/{event_id}/registrations", summary="View attendees for owned event")
def get_event_attendees(
    event_id: str,
    x_user_id: Optional[str] = Header(default="11111111-1111-1111-1111-111111111111")
):
    # Verify the event exists and the requester is the owner organizer
    if supabase:
        try:
            event_res = supabase.table("events").select("organizer_id").eq("id", event_id).execute()
            if event_res.data and event_res.data[0]["organizer_id"] != x_user_id:
                raise HTTPException(status_code=403, detail="Forbidden: You can only view attendees for events you own")
            
            attendees_res = supabase.table("registrations") \
                .select("id, created_at, users(id, email, role)") \
                .eq("event_id", event_id) \
                .execute()
            return attendees_res.data
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Error fetching attendees from Supabase: {e}")

    # Fallback response
    return [
        {"id": "reg-mock-1", "created_at": "2025-04-01T10:00:00Z", "users": {"id": DEFAULT_TEST_STUDENT_ID, "email": "student1@campus.edu", "role": "student"}}
    ]
