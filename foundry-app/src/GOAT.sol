// contracts/GameItem.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract GOAT is ERC721 {
    error AlreadyMinted();

    uint256 public _nextTokenId;

    mapping (address => bool)  public hasMinted;

    constructor() ERC721("GameItem", "ITM") {}

    function mint(address player) public returns (uint256) {
        if (hasMinted[player]==true){
        revert AlreadyMinted();
        }   
        
        hasMinted[player] = true;
        uint256 tokenId = _nextTokenId++;
        _mint(player, tokenId);

        return tokenId;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        
        return "bafkreibxq6adde3l3hettyvv2tjamcxkg7tocfvbn64qz2kncnvozhfs5a";
    }

}