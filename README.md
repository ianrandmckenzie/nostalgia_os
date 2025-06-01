# Nostalgia OS
A website in the style of old-school operating systems.

## Adding new desktop icons
WARNING: This section is out of date.
1. Search in the document for `<!-- Desktop Icons -->`
2. Copy one of them and customize as needed:
```
  <div id="icon-computer" class="flex flex-col items-center cursor-pointer draggable-icon"
    data-window-title="My Computer" data-window-id="desktopIcon1" data-window-type="default"
    data-window-dimensions='{"type": "default"}'>
    <img src="./image/computer.svg" alt="My Computer" class="mb-1 shadow-lg max-w-20" />
    <span class="text-xs">My Computer</span>
  </div>
```
3. Example icon:
```
  <div id="example" class="flex flex-col items-center cursor-pointer draggable-icon"
    data-window-title="Example" data-window-id="desktopIcon1" data-window-type="default"
    data-window-dimensions='{"type": "default"}'
    data-window-content='<p>This is example markup. Recommended to ampersand escape reserved characters.</p>'>
    <img src="./image/example.svg" alt="Example" class="mb-1 shadow-lg max-w-20" />
    <span class="text-xs">Example</span>
  </div>
```

## Adding new Start Menu items
WARNING: This section is out of date.
1. Search in the document for `<!-- Start Menu -->`
2. Copy one of them and customize as needed:
```html
<li class="px-4 py-2 hover:bg-gray-50 cursor-pointer" onclick="openNav('Settings', { type: 'default' }, 'Settings')">Settings</li>
```
3. Modified menu item:
```html
<li class="px-4 py-2 hover:bg-gray-50 cursor-pointer" onclick="openNav('ExampleItem', '<p class=&quot;font-bold&quot;>This is some example content using HTML markup</p>', { type: 'integer', width: 600, height: 400 }, 'ExampleItem')">Example Item</li>
```

## Adding new media files for the Documents folder
WARNING: This section is out of date.
1. Add the filename in `api/media.json`
```json
[
  "inspo.jpg",
  "mail.mp3",
  "test.html",
  "FAQ.md",
  "contact.txt",
  "my-new-item.webp"
]
```
2. Paste your new file in the `media` folder
```
media
├── FAQ.md
├── contact.txt
├── inspo.jpg
├── mail.mp3
├── test.html
└── my-new-item.webp
```

## Buttons
This is how buttons should be implemented.
```html
<button id="some-example-button" onclick="setTimeout(function(){toggleButtonActiveState('some-example-button', 'OK')}, 1000);toggleButtonActiveState('some-example-button', 'Cool!');createWindow('OK Button Pressed', 'Your OK button has successfully been pressed!', false, 'ok-pressed', false, false, { type: 'integer', height: 300, width: 200 }, 'default');" class="bg-gray-200 border-t-2 border-l-2 border-gray-300 mr-2"><span class="border-b-2 border-r-2 border-black block h-full w-full py-1.5 px-3">OK</span></button>
```
