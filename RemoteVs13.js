let currentInfowindow = null;  // Add this line
let map, directionsService, directionsRenderer;
let markers = []; // Initialize markers array
let kmlLayers = [null, null, null], 
    kmlUrls = [
        'https://raw.githubusercontent.com/checomoandas/noblenomad/main/Safest%20and%20most%20walkable.kml', 
        'https://raw.githubusercontent.com/checomoandas/noblenomad/main/Safe%20but%20less%20walkable.kml', 
        'https://raw.githubusercontent.com/checomoandas/noblenomad/main/Feels%20sketchy%20at%20night.kml'
    ];
let activeFilters = { category: [], category2: [], category3: [], complex: [] }; // Ensure activeFilters is also declared

function loadGoogleMapsScript() {
    const script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyCAK_oC-2iPESygmTO20tMTBJ5Eyu5_3Rw&libraries=places&callback=onGoogleMapsScriptLoad';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
}

function onGoogleMapsScriptLoad() {
    initMap();  // Initialize the map immediately
    initKMLLayers();
}

loadGoogleMapsScript();

        function initMap() {
            map = new google.maps.Map(document.getElementById('map'), { center: { lat: -34.58, lng: -58.42 }, zoom: 13, mapTypeControl: false });
            directionsService = new google.maps.DirectionsService();
            directionsRenderer = new google.maps.DirectionsRenderer();
            directionsRenderer.setMap(map);
            new google.maps.places.Autocomplete(document.getElementById('startLocation'));

            fetchMarkersData();

            attachCategoryButtonsEventListeners();
        }

        function fetchMarkersData() {
            fetch('https://raw.githubusercontent.com/checomoandas/noblenomad/main/BsAsPins.csv')
                .then(response => response.text())
                .then(processCSVData)
                .catch(error => console.error('Error fetching or parsing CSV data:', error));
        }

        function processCSVData(csvData) {
            csvData.split('\n').slice(1).forEach(line => {
                const columns = line.split(',');
                let data = {
                    name: columns[0], lat: parseFloat(columns[1]), lng: parseFloat(columns[2]), popup_header: columns[3], popupimage_url: columns[4], description: columns[5], icon_url: columns[6], category: columns[7], category2: columns[8], category3: columns[9]
                };
                if (!isNaN(data.lat) && !isNaN(data.lng)) {
                    createMarker(data);
                }
            });
        }

        function attachCategoryButtonsEventListeners() {
            document.querySelectorAll('button[data-category]').forEach(button => {
                button.addEventListener('click', function() {
                    handleCategoryButtonClick(this);
                });
            });
        }

function handleCategoryButtonClick(button) {
    let categoryType = button.getAttribute('data-category');
    let categoryValues = button.hasAttribute('data-value') ? [button.getAttribute('data-value')] : button.hasAttribute('data-values') ? button.getAttribute('data-values').split(',') : [];
    button.classList.toggle('active');

    if (categoryType === 'complex') {
        if (button.classList.contains('active')) {
            activeFilters.complex = [...new Set([...activeFilters.complex, ...categoryValues])];
        } else {
            activeFilters.complex = activeFilters.complex.filter(val => !categoryValues.includes(val));
        }
    } else {
        updateActiveFilters(categoryType, categoryValues, button.classList.contains('active'));
    }
    applyFilters();
}

function updateActiveFilters(categoryType, categoryValues, isActive) {
    if (categoryType !== 'complex') {
        categoryValues.forEach(value => {
            let index = activeFilters[categoryType].indexOf(value);
            if (index > -1) {
                activeFilters[categoryType].splice(index, 1);
            } else if (isActive) {
                activeFilters[categoryType].push(value);
            }
        });
    }
}
        function initKMLLayers() {
            kmlUrls.forEach((url, index) => {
                kmlLayers[index] = new google.maps.KmlLayer({ url: url, map: null });
            });
        }
        
function toggleKMLLayer(index) {
    if (kmlLayers[index] && kmlLayers[index].setMap) {
        if (kmlLayers[index].getMap()) {
            kmlLayers[index].setMap(null);
            document.getElementById(`kml${index + 1}Button`).classList.remove('active');
        } else {
            kmlLayers[index].setMap(map);
            document.getElementById(`kml${index + 1}Button`).classList.add('active');
        }
    }
}

function createMarker(data) {
    let markerOptions = {
        position: { lat: data.lat, lng: data.lng },
        map: map,
        title: data.name
    };
    if (data.icon_url && data.icon_url.startsWith('http')) {
        markerOptions.icon = { url: data.icon_url, scaledSize: new google.maps.Size(32, 32) };
    }
    let marker = new google.maps.Marker(markerOptions);
    marker.category = data.category;
    marker.category2 = data.category2;
    marker.category3 = data.category3;
    markers.push(marker);

    // Infowindow content with a specific class for the "Copy Address" link
    let infowindowContent = `
<div style="width:250px; word-wrap:break-word;">
    <div style="font-size:20px; font-weight:bold; color:black; font-family:'Gill Sans MT', Arial; margin-bottom:8px;">
        ${escapeHTML(data.popup_header)}
        <a href="#" class="copy-address-link" style="font-size:14px; font-family:'Gill Sans MT', Arial; margin-left:10px;">COPY ADDRESS</a>
    </div>
    <img src="${escapeHTML(data.popupimage_url)}" style="width:100%; height:auto; margin-bottom:8px;">
    <div style="font-size:16px; color:black; font-family:'Gill Sans MT', Arial;">${escapeHTML(data.description)}</div>
    <a href="#" onclick="onGetDirectionsClick({lat:${data.lat},lng:${data.lng}},'${escapeHTML(data.popup_header)}')">Get Directions</a>
</div>
`;

    let infowindow = new google.maps.InfoWindow({ content: infowindowContent });
    marker.addListener('click', () => {
        if (currentInfowindow) currentInfowindow.close();
        currentInfowindow = infowindow;
        infowindow.open(map, marker);

        // Set up the event listener after the infowindow is opened
        google.maps.event.addListenerOnce(infowindow, 'domready', () => {
            document.querySelector('.copy-address-link').addEventListener('click', function(event) {
                event.preventDefault();
                copyToClipboard(data.name);
            });
        });
    });
}

function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Address copied to clipboard!');
    }).catch(err => {
        console.error('Could not copy text: ', err);
    });
}


function calculateAndDisplayRoute() {
    let start = document.getElementById('startLocation').value;
    let end = document.getElementById('endLocation').value;
    let travelMode = document.getElementById('travelMode').value;
    if (!start || !end) {
        alert('Please enter both start and end locations.');
        return;
    }
    directionsService.route({
        origin: start,
        destination: end,
        travelMode: travelMode
    }, function(response, status) {
        if (status === 'OK') {
            directionsRenderer.setDirections(response);
            displayRouteDetails(response);
            if (currentInfowindow) currentInfowindow.close();
        } else {
            window.alert('Directions request failed due to ' + status);
        }
    });
}

function displayRouteDetails(response) {
    const route = response.routes[0];
    let duration = route.legs[0].duration.text;
    let distance = route.legs[0].distance.text;
    document.getElementById('routeDetails').innerHTML = `Distance: ${distance}, Duration: ${duration}`;
}

function onGetDirectionsClick(endLocation, endLocationName) {
    document.getElementById('endLocation').value = `${endLocation.lat}, ${endLocation.lng}`;
    document.getElementById('endLocationName').textContent = endLocationName;
    document.getElementById('directionsPanel').style.display = 'block';
}

function copyAddress() {
    let endLocation = document.getElementById('endLocation').value;
    navigator.clipboard.writeText(endLocation).then(() => {
        alert('Address copied to clipboard!');
    }).catch(err => {
        alert('Error in copying text: ', err);
    });
}

function applyFilters() {
    markers.forEach(marker => {
        let isComplexVisible = false;
        let isCategory2Visible = true;

        if (activeFilters.complex.length > 0) {
            isComplexVisible = activeFilters.complex.some(value => marker.category && marker.category.split(',').includes(value));
        }

        if (activeFilters.category2.length > 0) {
            isCategory2Visible = activeFilters.category2.includes(marker.category2);
        }

        let isVisible = false;
        if (isComplexVisible || activeFilters.complex.length === 0) {
            isVisible = isCategory2Visible;
        }

        if (!isVisible) {
            for (let type in activeFilters) {
                if (type !== 'complex' && type !== 'category2' && activeFilters[type].length > 0) {
                    isVisible = activeFilters[type].some(value => marker[type] && marker[type].split(',').includes(value));
                    if (isVisible) break;
                }
            }
        }

        marker.setMap(isVisible ? map : null);
    });
}
