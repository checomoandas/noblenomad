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

let currentImageUrls = [];
let currentImageIndex = 0;

function onLeftArrowClick() {
    if (currentImageIndex > 0) {
        currentImageIndex--;
        refreshInfowindowContent();
    }
}

function onRightArrowClick() {
    if (currentImageIndex < currentImageUrls.length - 1) {
        currentImageIndex++;
        refreshInfowindowContent();
    }
}

function refreshInfowindowContent() {
    if (currentInfowindow && currentImageUrls.length > 0 && currentImageUrls[currentImageIndex]) {
        let content = createInfowindowContent(currentImageUrls[currentImageIndex]);
        currentInfowindow.setContent(content);
    }
}

function createInfowindowContent(data) {
    if (!data || !data.popupimage_url) {
        console.error("Data or imageUrl is undefined in createInfowindowContent");
        return "";
    }

    let imageUrl = escapeHTML(data.popupimage_url.split('|')[currentImageIndex]);

    return `
        <div style="width:250px; word-wrap:break-word;">
            <div style="position: relative;">
                <img class="infowindow-image" src="${imageUrl}" style="width:100%; height:auto; margin-bottom:8px;">
                <button onclick="onLeftArrowClick()" style="position: absolute; left: 0; top: 50%;">&#9664;</button>
                <button onclick="onRightArrowClick()" style="position: absolute; right: 0; top: 50%;">&#9654;</button>
            </div>
        </div>
    `;
}


function escapeHTML(str) {
    if (typeof str !== 'string') {
        console.error('Invalid input for escapeHTML:', str);
        // Convert non-string input to a string to prevent errors
        str = String(str);
    }
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function loadGoogleMapsScript() {
    if (!window.google || !window.google.maps) {
        const script = document.createElement('script');
        script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyCAK_oC-2iPESygmTO20tMTBJ5Eyu5_3Rw&libraries=places&callback=onGoogleMapsScriptLoad';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Call loadGoogleMapsScript when the DOM is fully loaded
    loadGoogleMapsScript();
});

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), { center: { lat: -34.58, lng: -58.42 }, zoom: 13, mapTypeControl: false });
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);
    new google.maps.places.Autocomplete(document.getElementById('startLocation'));

    fetchMarkersData();

    attachCategoryButtonsEventListeners();
}
function initKMLLayers() {
    kmlUrls.forEach((url, index) => {
        kmlLayers[index] = new google.maps.KmlLayer({ url: url, map: null });
    });
}

function attachCategoryButtonsEventListeners() {
    document.querySelectorAll('button[data-category]').forEach(button => {
        button.addEventListener('click', function() {
            handleCategoryButtonClick(this);
        });
    });
}

function onGoogleMapsScriptLoad() {
    initMap();
    initKMLLayers();
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
            name: columns[0],
            lat: parseFloat(columns[1]), 
            lng: parseFloat(columns[2]),
            popup_header: columns[3],
            popupimage_url: columns[4],
            description: columns[5],
            icon_url: columns[6],
            category: columns[7] ? columns[7].split('|') : [], 
            category2: columns[8] ? columns[8].split('|') : [],
            category3: columns[9] ? columns[9].split('|') : []
        };

        if (!isNaN(data.lat) && !isNaN(data.lng)) {
            createMarker(data);
        }
    });
}

function handleCategoryButtonClick(button) {
    let categoryType = button.getAttribute('data-category');
    if (!categoryType) {
        console.error('Button does not have a data-category attribute', button);
        return;
    }

    let categoryValues;
    if (button.hasAttribute('data-values')) {
        categoryValues = button.getAttribute('data-values').split(',');
    } else if (button.hasAttribute('data-value')) {
        categoryValues = [button.getAttribute('data-value')];
    } else {
        console.error('Button does not have data-values or data-value attributes', button);
        return;
    }

    button.classList.toggle('active');

  if (button.classList.contains('active')) {
    activeFilters[categoryType] = [...new Set([...activeFilters[categoryType], ...categoryValues])];
} else {
    activeFilters[categoryType] = activeFilters[categoryType].filter(val => !categoryValues.includes(val));
}

    applyFilters();
}


function applyFilters() {
    markers.forEach(marker => {
        let isComplexVisible = activeFilters.complex.length === 0; 
        let isCategory2Visible = activeFilters.category2.length === 0; 

        if (activeFilters.complex.length > 0 && marker.category) {
            isComplexVisible = activeFilters.complex.some(value => marker.category.includes(value));
        }

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

    let imageUrls = data.popupimage_url.split('|');

let infowindow = new google.maps.InfoWindow({ content: createInfowindowContent(data, imageUrls[0]) });

marker.addListener('click', () => {
    currentImageUrls = imageUrls;
    currentImageIndex = 0;

    if (currentInfowindow) currentInfowindow.close();
    currentInfowindow = infowindow;
    infowindow.open(map, marker);

google.maps.event.addListenerOnce(infowindow, 'domready', () => {
    let copyLink = document.querySelector('.copy-address-link');
    if (copyLink) {
        copyLink.addEventListener('click', function(event) {
            event.preventDefault();
            copyToClipboard(data.name);
        });
    } else {
        console.error('Element with class .copy-address-link not found');
    }
});
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
