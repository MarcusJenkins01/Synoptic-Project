const EARTH_RADIUS = 6378;

function degToRad(degrees) {
    return (degrees * Math.PI) / 180;
}

// Function to get the distance to the bike from the user
function getDistance(b_lat, b_lon, u_lat, u_lon) {
    let d_lat = degToRad(u_lat - b_lat);
    let d_lon = degToRad(u_lon - b_lon);

    b_lat = degToRad(b_lat);
    u_lat = degToRad(u_lat);

    // Using the Haversine formula
    let a = Math.sin(d_lat / 2) ** 2 + Math.cos(b_lat) * Math.cos(u_lat) * Math.sin(d_lon / 2) ** 2;
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    let d = EARTH_RADIUS * c;

    if (d < 1) {
        d = Math.round(d * 10) / 10;
    } else {
        d = Math.round(d);
    }
        
    return d;
}
