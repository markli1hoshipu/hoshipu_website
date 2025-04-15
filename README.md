# Applications for Yif

This repository contains many Python applications built with PySide2/6, and serves as tools for Yif international to improve the working efficiency. The following applications are still in use:

1. **CZ Passenger Info Reader** - A tool to extract passenger information from Southern Airlines B2B orders
2. **Airport Code Translator** - A utility for translating airport codes to full names

## CZ Passenger Info Reader

### Overview

This application automates the retrieval of passenger information from China Southern Airlines' B2B platform. It logs into the B2B system, searches for order numbers, and extracts passenger details and contact information.

### Features

- Extract passenger names and contact details using order numbers (GO keys)
- Display extracted information in organized sections
- Support for processing multiple orders simultaneously
- Clean user interface with separate areas for input and output data

### Requirements

- Python 3.x
- PySide6
- Selenium
- Chrome WebDriver

### Usage

1. Ensure you have your account credentials stored in `account.txt` (first line: account ID, second line: password)
2. Run the application: `python cz_pread.py`
3. Enter your GO order numbers in the input field (one per line)
4. Click "生成" (Generate) to process the orders
5. View the extracted passenger names, contact information, and detailed data in the respective output sections

## Airport Code Translator

### Overview

A simple utility that translates airport codes to their full names based on a reference file.

### Features

- Quick translation of airport codes to full names
- Support for processing multiple codes at once
- Clean user interface

### Requirements

- Python 3.x
- PySide6

### Usage

1. Ensure you have an `airports.txt` file with airport code mappings
2. Run the application: `python short_translate.py`
3. Enter airport codes in the input field
4. Click "生成" (Generate) to translate the codes
5. View the translated results in the output field

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/cz-tools.git
cd cz-tools

# Install dependencies
pip install PySide6 selenium

# Run the applications
python cz_pread.py
# or
python short_translate.py
```

## Build Standalone Applications

You can build standalone executables using PyInstaller:

```bash
# For Airport Code Translator
pyinstaller --noconsole --onefile --icon=translate.ico short_translate.py

# For CZ Passenger Info Reader
pyinstaller --noconsole --onefile cz_pread.py
```

## Note on Security

The CZ Passenger Info Reader requires B2B platform credentials. Never share your `account.txt` file or include it in version control. Add it to your `.gitignore` file.

## License

[MIT License](LICENSE)
