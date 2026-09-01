import json
import urllib.request
import urllib.error
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

# Custom User-Agent header required by public OSRM server policy
HEADERS = {
    'User-Agent': 'WasteManagementRouteOptimizer/1.0 (Contact: admin@example.com)'
}

def fetch_osrm_json(url: str):
    """Safely executes HTTP request and validates JSON response."""
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                body = response.read().decode('utf-8')
                try:
                    return json.loads(body)
                except json.JSONDecodeError:
                    raise Exception(f"Failed to parse JSON response: {body[:50]}")
            else:
                raise Exception(f"OSRM returned HTTP status {response.status}")
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else ''
        raise Exception(f"HTTP Error {e.code}: {e.reason}. Response: {error_body[:100]}")
    except urllib.error.URLError as e:
        raise Exception(f"URL Error: {e.reason}")

def get_osrm_distance_matrix(locations: list) -> list:
    coord_string = ";".join([f"{loc['lng']},{loc['lat']}" for loc in locations])
    url = f"http://router.project-osrm.org/table/v1/driving/{coord_string}?annotations=distance"
    
    data = fetch_osrm_json(url)
    if "distances" not in data:
        raise Exception(f"OSRM table error: {data.get('message', 'Unknown error')}")
        
    return [[int(cell) for cell in row] for row in data["distances"]]

def get_optimized_route_data():
    locations = [
        {"id": "Depot", "name": "Batangas City Waste Management Facility (San Jose Sico)", "lat": 13.7479, "lng": 121.1660, "demand": 0},
        {"id": "Bin_01", "name": "Sampaga Central (Brgy Hall Area)", "lat": 13.7562, "lng": 121.1035, "demand": 1},
        {"id": "Bin_02", "name": "Sampaga East Chapel Junction", "lat": 13.7568, "lng": 121.1070, "demand": 1},
        {"id": "Bin_03", "name": "Sampaga Talipapa Market", "lat": 13.7575, "lng": 121.1020, "demand": 1},
        {"id": "Bin_04", "name": "Sampaga Primary School Zone", "lat": 13.7545, "lng": 121.1050, "demand": 1},
        {"id": "Bin_05", "name": "Sampaga West Border Road", "lat": 13.7550, "lng": 121.0965, "demand": 1},
        {"id": "Bin_06", "name": "Gov Carpio Rd - Sampaga Stretch", "lat": 13.7560, "lng": 121.0995, "demand": 1},
        {"id": "Bin_07", "name": "Sampaguita Drive Entrance", "lat": 13.7525, "lng": 121.1040, "demand": 1},
        {"id": "Bin_08", "name": "Pallocan East Brgy Hall Area", "lat": 13.7548, "lng": 121.0770, "demand": 1},
        {"id": "Bin_09", "name": "Pallocan East Covered Court", "lat": 13.7540, "lng": 121.0760, "demand": 1},
        {"id": "Bin_10", "name": "Pallocan East Elem School Front", "lat": 13.7535, "lng": 121.0782, "demand": 1},
        {"id": "Bin_11", "name": "Pallocan Bridge North Approach", "lat": 13.7565, "lng": 121.0795, "demand": 1},
        {"id": "Bin_12", "name": "Greenwoods South Main Gate", "lat": 13.7510, "lng": 121.0745, "demand": 1},
        {"id": "Bin_13", "name": "Manalo St Residential Cluster", "lat": 13.7555, "lng": 121.0750, "demand": 1},
        {"id": "Bin_14", "name": "Lopez St Commercial Strip", "lat": 13.7530, "lng": 121.0798, "demand": 1},
        {"id": "Bin_15", "name": "Pallocan-Sampaga Boundary Road", "lat": 13.7555, "lng": 121.0875, "demand": 1}
    ]

    num_vehicles = 3
    vehicle_capacities = [5, 5, 5]
    depot_index = 0

    try:
        distance_matrix = get_osrm_distance_matrix(locations)
    except Exception as e:
        print(f"❌ Failed to fetch distance matrix: {e}")
        return {"error": str(e), "routes": []}

    manager = pywrapcp.RoutingIndexManager(len(locations), num_vehicles, depot_index)
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        return distance_matrix[manager.IndexToNode(from_index)][manager.IndexToNode(to_index)]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    def demand_callback(from_index):
        from_node = manager.IndexToNode(from_index)
        return locations[from_node]["demand"]

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    
    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0,                  
        vehicle_capacities, 
        True,               
        "Capacity"
    )

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.seconds = 5

    solution = routing.SolveWithParameters(search_parameters)

    routes_data = []
    total_fleet_distance = 0

    if solution:
        for vehicle_id in range(num_vehicles):
            index = routing.Start(vehicle_id)
            route_stops = []
            route_distance = 0
            bins_collected = 0

            while not routing.IsEnd(index):
                node = manager.IndexToNode(index)
                route_stops.append(locations[node])
                if locations[node]["demand"] > 0:
                    bins_collected += locations[node]["demand"]

                previous_index = index
                index = solution.Value(routing.NextVar(index))
                route_distance += routing.GetArcCostForVehicle(previous_index, index, vehicle_id)

            route_stops.append(locations[manager.IndexToNode(index)])
            total_fleet_distance += route_distance

            # Fetch GeoJSON geometry safely
            coord_string = ";".join([f"{loc['lng']},{loc['lat']}" for loc in route_stops])
            route_url = f"http://router.project-osrm.org/route/v1/driving/{coord_string}?overview=full&geometries=geojson"
            
            try:
                osrm_data = fetch_osrm_json(route_url)
                geometry = osrm_data["routes"][0]["geometry"]["coordinates"]
            except Exception as e:
                print(f"⚠️ Warning: Polyline geometry fetching failed for Truck #{vehicle_id + 1}: {e}")
                # Fallback to straight line if OSRM route fails
                geometry = [[loc["lng"], loc["lat"]] for loc in route_stops]

            routes_data.append({
                "truck_id": vehicle_id + 1,
                "bins_collected": bins_collected,
                "distance_km": round(route_distance / 1000.0, 2),
                "stops": route_stops,
                "road_geometry": geometry
            })

    return {
        "routes": routes_data,
        "total_fleet_distance_km": round(total_fleet_distance / 1000.0, 2)
    }