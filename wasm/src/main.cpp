#include <iostream>
#include <fstream>
#include <vector>
#include <string>
#include <sstream>
#include <unordered_map>
#include <algorithm> // for std::shuffle
#include <random>    // for std::default_random_engine
#include <chrono>    // for std::chrono

struct Row {
    float start;
    float length;
    float firstPanel; // Change field type to float
};

std::vector<Row> rows;
std::vector<int> order;

struct Options {
    float first;
    float second;
    float min;
    float margin;
    float cut;
    float panel;
    float leftOver; // New field
    float time;     // New field
};

Options options;

float bestFirst = 0.0f;
float currentBestFirst = 0.0f;

std::random_device rd;
std::default_random_engine rng(rd());

void fillOrder(size_t size) {
    order.resize(size);
    for (size_t i = 0; i < size; ++i) {
        order[i] = i;
    }
}

void shuffleOrder(int startIndex) {
    std::shuffle(order.begin() + startIndex, order.end(), rng);
    //std::shuffle(order.begin() + 1, order.end(), rng);
}

void swapOrder(int numSwaps) {
    //std::uniform_int_distribution<int> dist(1, order.size() - 1);
    std::uniform_int_distribution<int> dist(0, order.size() - 1);
    for (int i = 0; i < numSwaps; ++i) {
        int idx1 = dist(rng);
        int idx2 = dist(rng);
        std::swap(order[idx1], order[idx2]);
    }
}

void initFirstPanel() {
    for (auto& row : rows) {
        row.firstPanel = -1000000.0f;
    }
}

float calcDifference(float value1, float value2) {
    float diff = std::min(std::abs(value1 - value2), std::abs(value1 - value2 + options.panel));
    diff = std::min(diff, std::abs(value1 - value2 - options.panel));
    return diff;
}

bool checkRow(int rowIndex) {
    const Row& currentRow = rows[rowIndex];

    float minFirst = std::numeric_limits<float>::max();

    // Check previous row if it exists
    if (rowIndex > 0) {
        const Row& previousRow = rows[rowIndex - 1];
        minFirst = calcDifference(currentRow.firstPanel, previousRow.firstPanel);
        if (minFirst < bestFirst) {
            return false;
        }
    }

    // Check next row if it exists
    if (rowIndex < rows.size() - 1) {
        const Row& nextRow = rows[rowIndex + 1];
        minFirst = std::min(minFirst, calcDifference(currentRow.firstPanel, nextRow.firstPanel));
        if (minFirst < bestFirst) {
            return false;
        }
    }

    if (options.second < 0.0001 || options.first < 0.0001) {
        if (minFirst <= bestFirst) {
            return false;
        }    
        currentBestFirst = std::min(currentBestFirst, minFirst);
        return true;
    }

    float minSecond = std::numeric_limits<float>::max();
    float bestSecond = bestFirst / options.first * options.second;

    // Check two rows before if it exists
    if (rowIndex > 1) {
        const Row& twoRowsBefore = rows[rowIndex - 2];
        minSecond = calcDifference(currentRow.firstPanel, twoRowsBefore.firstPanel);
        if (minSecond < bestSecond) {
            return false;
        }
    }

    // Check two rows after if it exists
    if (rowIndex < rows.size() - 2) {
        const Row& twoRowsAfter = rows[rowIndex + 2];
        minSecond = std::min(minSecond, calcDifference(currentRow.firstPanel, twoRowsAfter.firstPanel));
        if (minSecond < bestSecond) {
            return false;
        }
    }

    minFirst = std::min(
        minFirst,
        minSecond / options.second * options.first
    );

    if (minFirst <= bestFirst) {
        return false;
    }

    currentBestFirst = std::min(currentBestFirst, minFirst);

    return true;
}

bool fillRow(int rowIndex, float& leftOver) {
    Row& row = rows[rowIndex];
    row.firstPanel = row.start + leftOver;

    while (row.firstPanel < 0) {
        row.firstPanel += options.panel;
    }

    while (row.firstPanel > options.panel) {
        row.firstPanel -= options.panel;
    }

    if (!checkRow(rowIndex)) {
        return false;
    }

    leftOver -= (row.length + 2 * options.margin);

    while (leftOver < 0) {
        leftOver += options.panel;
    }

    leftOver -= options.cut;

    return true;
}

int processRowsInOrder() {
    initFirstPanel();
    currentBestFirst = std::numeric_limits<float>::max();
    float leftOver = options.leftOver;
    for (const int& index : order) {
        if (!fillRow(index, leftOver)) {
            return index;
        }
        if (leftOver < options.min) {
            leftOver = 0.0f;
        }
    }
    return -1;
}

float score() {
    float totalScore = 0.0f;
    for (size_t i = 0; i < order.size(); ++i) {
        for (size_t j = 0; j < i; ++j) {
            if (order[j] > order[i]) {
                totalScore += 1.0f;
            }
        }
    }
    return -totalScore;
}

int main(int argc, char* argv[]) {
    if (argc != 3) {
        std::cerr << "Usage: " << argv[0] << " <numbers_filename> <key_value_filename>" << std::endl;
        return 1;
    }

    std::ifstream numbersFile(argv[1]);
    if (!numbersFile.is_open()) {
        std::cerr << "Could not open the file " << argv[1] << std::endl;
        return 1;
    }

    std::string line;
    while (std::getline(numbersFile, line)) {
        // Ignore empty lines
        if (line.empty()) continue;
        // Ignore comments
        if (line[0] == '#') continue;

        std::istringstream iss(line);
        float start, length;
        if (iss >> start >> length) {
            rows.push_back({start, length, 0.0f}); // Initialize firstPanel with 0.0f
        }
    }

    numbersFile.close();

    initFirstPanel(); // Call the function to initialize firstPanel with -1000000.0f

    std::ifstream keyValueFile(argv[2]);
    if (!keyValueFile.is_open()) {
        std::cerr << "Could not open the file " << argv[2] << std::endl;
        return 1;
    }

    std::unordered_map<std::string, float*> keyMap = {
        {"first", &options.first},
        {"second", &options.second},
        {"min", &options.min},
        {"margin", &options.margin},
        {"cut", &options.cut},
        {"panel", &options.panel},
        {"leftOver", &options.leftOver},
        {"time", &options.time}, // New key-value pair
    };

    while (std::getline(keyValueFile, line)) {
        // Ignore empty lines
        if (line.empty()) continue;
        // Ignore comments
        if (line[0] == '#') continue;

        std::istringstream iss(line);
        std::string key;
        float value;
        if (iss >> key >> value) {
            if (keyMap.find(key) != keyMap.end()) {
                *keyMap[key] = value;
            }
        }
    }

    keyValueFile.close();

    // Output the key-value pairs for verification
    std::cout << "first: " << options.first << std::endl;
    std::cout << "second: " << options.second << std::endl;
    std::cout << "min: " << options.min << std::endl;
    std::cout << "margin: " << options.margin << std::endl;
    std::cout << "cut: " << options.cut << std::endl;
    std::cout << "panel: " << options.panel << std::endl;
    std::cout << "leftOver: " << options.leftOver << std::endl;
    std::cout << "time: " << options.time << std::endl; // New output

    fillOrder(rows.size());
    float bestFirst = 0.0f;
    //shuffleOrder();

    for (int i = 0; i < 100000000; i++) {
        int ret = processRowsInOrder();
        if (ret < 0) {
            if (currentBestFirst > bestFirst) {
                bestFirst = currentBestFirst;
                std::cout << "Best first: " << bestFirst << std::endl;
                for (const int& num : order) {
                    std::cout << num << std::endl;
                }
            }
            shuffleOrder(0);
        } else {
            int rand = rng() % (10 * order.size());
            shuffleOrder(std::min(rand, ret));
        }
    }

    /*shuffleOrder();

    bool success = false;
    float bestScore = std::numeric_limits<float>::lowest();
    std::vector<int> bestOrder;

    for (int swaps = order.size() * 3; swaps > 0; --swaps) {
        auto startTime = std::chrono::steady_clock::now();
        while (std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now() - startTime).count() < options.time / (float)order.size()) {
            if (processRowsInOrder()) {
                float currentScore = score();
                if (currentScore > bestScore) {
                    bestScore = currentScore;
                    bestOrder = order;
                    success = true;
                }
            }
            if (swaps >= order.size()) {
                shuffleOrder();
            } else {
                swapOrder(swaps);
            }
        }

        if (swaps >= 2 * order.size()) {
            std::cout << "Full random: " << swaps << std::endl;
        } else {
            std::cout << "Swaps: " << swaps << std::endl;
        }
        // Output the best score and order vector
        std::cout << "Best score: " << bestScore << std::endl;
        for (const int& num : bestOrder) {
            std::cout << num << std::endl;
        }
    }

    if (!success) {
        std::cerr << "Error: Unable to process rows in the specified time." << std::endl;
        return 1;
    }*/

    return 0;
}
