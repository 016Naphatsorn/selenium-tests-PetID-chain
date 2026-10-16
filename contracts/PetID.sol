
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PetID {

    struct Pet {
        uint256 id;
        string name;
        string species;
        string breed;
        string microchipId;
        string imageURI;
        address owner;
        bool exists;
    }

    uint256 private petCount;

    mapping(uint256 => Pet) public pets;

    event PetRegistered(
        uint256 indexed petId,
        string name,
        address indexed owner
    );

    event OwnershipTransferred(
        uint256 indexed petId,
        address indexed previousOwner,
        address indexed newOwner
    );

    constructor() {
        petCount = 0;
    }

    function registerPet(
        string memory _name,
        string memory _species,
        string memory _breed,
        string memory _microchipId,
        string memory _imageURI
    ) public {

        petCount++;

        pets[petCount] = Pet(
            petCount,
            _name,
            _species,
            _breed,
            _microchipId,
            _imageURI,
            msg.sender,
            true
        );

        emit PetRegistered(
            petCount,
            _name,
            msg.sender
        );
    }

    function getPet(uint256 _petId)
        public
        view
        returns (
            uint256,
            string memory,
            string memory,
            string memory,
            string memory,
            string memory,
            address,
            bool
        )
    {
        require(pets[_petId].exists, "Pet does not exist");

        Pet memory pet = pets[_petId];

        return (
            pet.id,
            pet.name,
            pet.species,
            pet.breed,
            pet.microchipId,
            pet.imageURI,
            pet.owner,
            pet.exists
        );
    }

    function transferOwnership(
        uint256 _petId,
        address _newOwner
    ) public {

        require(
            pets[_petId].exists,
            "Pet does not exist"
        );

        require(
            pets[_petId].owner == msg.sender,
            "Only owner can transfer"
        );

        require(
            _newOwner != address(0),
            "Invalid new owner"
        );

        address previousOwner = pets[_petId].owner;

        pets[_petId].owner = _newOwner;

        emit OwnershipTransferred(
            _petId,
            previousOwner,
            _newOwner
        );
    }

    function getPetCount()
        public
        view
        returns (uint256)
    {
        return petCount;
    }
}

