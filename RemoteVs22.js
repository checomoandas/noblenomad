let currentInfowindow = null;
let map, directionsService, directionsRenderer;
let markers = [];
let kmlLayers = [null, null, null],
    kmlUrls = [
        'https://raw.githubusercontent.com/checomoandas/noblenomad/main/Safest%20and%20most%20walkable.kml',
        'https://raw.githubusercontent.com/checomoandas/noblenomad/main/Safe%20but%20less%20walkable.kml',
        'https://raw.githubusercontent.com/checomoandas/noblenomad/main/Feels%20sketchy%20at%20night.kml'
    ];
let activeFilters = { category: [], category2: [], category3: [], complex: [] };

function loadGoogleMapsScript() {
    const script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyCAK_oC-2iPESygmTO20tMTBJ5Eyu5_3Rw&libraries=places&callback=onGoogleMapsScriptLoad';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
}

function onGoogleMapsScriptLoad() {
    initMap();
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

        // Assuming columns order: name, latitude, longitude, popup_header, popupimage_url, description, icon_url, category, category2, category3
        let data = {
            name: columns[0],
            lat: parseFloat(columns[1]), 
            lng: parseFloat(columns[2]),
            popup_header: columns[3],
            popupimage_url: columns[4],
            description: columns[5],
            icon_url: columns[6],
            // Splitting categories by '|' if they exist
            category: columns[7] ? columns[7].split('|') : [], 
            category2: columns[8] ? columns[8].split('|') : [],
            category3: columns[9] ? columns[9].split('|') : []
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
    if (!categoryType) {
        console.error('Button does not have a data-category attribute', button);
        return; // Exit the function if categoryType is null or undefined.
    }

    let categoryValues;
    if (button.hasAttribute('data-values')) {
        categoryValues = button.getAttribute('data-values').split(',');
    } else if (button.hasAttribute('data-value')) {
        categoryValues = [button.getAttribute('data-value')];
    } else {
        console.error('Button does not have data-values or data-value attributes', button);
        return; // Exit the function if neither attribute is present.
    }

    button.classList.toggle('active');

    if (button.classList.contains('active')) {
        activeFilters[categoryType] = [...new Set([...activeFilters[categoryType], ...categoryValues])];
    } else {
        activeFilters[categoryType] = activeFilters[categoryType].filter(val => !categoryValues.includes(val));
    }

    applyFilters();
}

function updateComplexFilters(categoryValue, isActive) {
    let index = activeFilters.complex.indexOf(categoryValue);
    if (index > -1 && !isActive) {
        activeFilters.complex.splice(index, 1);
    } else if (isActive && index === -1) {
        activeFilters.complex.push(categoryValue);
    }
}

function updateActiveFilters(categoryType, categoryValue, isActive) {
    let index = activeFilters[categoryType].indexOf(categoryValue);
    if (index > -1 && !isActive) {
        activeFilters[categoryType].splice(index, 1);
    } else if (isActive && index === -1) {
        activeFilters[categoryType].push(categoryValue);
    }
}

function initKMLLayers() {
    kmlUrls.forEach((url, index) => {
        kmlLayers[index] = new google.maps.KmlLayer({ url: url, map: null });
    });
}

function applyFilters() {
    markers.forEach(marker => {
        let isComplexVisible = activeFilters.complex.length === 0; // Default to true if no complex filters are active.
        let isCategory2Visible = activeFilters.category2.length === 0; // Default to true if no category2 filters are active.

        // Check complex category
        if (activeFilters.complex.length > 0 && marker.category) {
            isComplexVisible = activeFilters.complex.some(value => marker.category.includes(value));
        }

        // Check category2
        if (activeFilters.category2.length > 0 && marker.category2) {
            isCategory2Visible = activeFilters.category2.some(value => marker.category2.includes(value));
        }

        let isVisible = isComplexVisible && isCategory2Visible;
        marker.setMap(isVisible ? map : null);
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

    let infowindowContent = `
<div style="width:250px; word-wrap:break-word;">
    <div style="font-size:20px; font-weight:bold; color:black; font-family:'Gill Sans MT', Arial; margin-bottom:8px;">
        ${escapeHTML(data.popup_header)}
        <a href="#" class="copy-address-link" style="font-size:14px; font-family:'Gill Sans MT', Arial; margin-left:16px;">COPY ADDRESS</a>
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
